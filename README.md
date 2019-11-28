# Logootish
The Logootish algorithm used by the Matrix Notepad. See the documentation
[on the wiki.](https://github.com/KB1RD/matrix-notepad/wiki/Logootish) Currently, this
is only used in `matrix-notepad`, but the code is generic enough that it could
be used in any collaboration system. The goal of Logootish is to ensure that
concurrent edits can successfully be merged together in a collaboration system.
Right now, this only supports ordered list types, such as strings or arrays, but
I hope to expand it to support full JSON, which would include maps. At the
moment, all APIs are subject to change.

Based on https://github.com/krasimir/webpack-library-starter

## Installation
```sh
# Grab the repo
git clone https://github.com/KB1RD/logootish-js.git

# Install packages
yarn install

# Build everything
yarn run build
yarn run build:docs

# Run tests (currently broken)
yarn run test
yarn run test:watch
yarn run test:cover

# Link it so that you can build packages locally with your local copy
yarn link
```

## Usage
Currently, the `Document` class is to maintain backwards compatability. It will
soon be restructured, so you shouldn't use it. Most of the program logic occurs
in the new `ListDocumentModel` class, where most of the old document code was
moved. The `ListDocumentModel` does not store anything, but is only a mapping
between Logoot positions and indexes. Since it does not actually touch the data
that you are ordering, you can use it to maintain consistency between *any* type
of ordered data -- Arrays, text, etc.

### Local Insertions
```javascript
const { ListDocumentModel } = require('./dist/logootish-js.min.js')

const m = new ListDocumentModel()

let { position, length, rclk } = m.insertLocal(0, 2)
console.log(`Inserted ${length} elements at position ${position.toString()} with a vector clock of ${rclk.toString()}`)
// Prints `Inserted 2 elements at position [0] with a vector clock of 0`

;({ position, length, rclk } = m.insertLocal(1, 2))
console.log(`Inserted ${length} elements at position ${position.toString()} with a vector clock of ${rclk.toString()}`)
// Prints `Inserted 2 elements at position [1,0] with a vector clock of 0`
```
Keep in mind, this doesn't actually insert anything anywhere: It just keeps a
record of where the new elements should go. In later examples, I will show how
to work with actual data.

### Local Removals
```javascript
const { ListDocumentModel } = require('./dist/logootish-js.min.js')

const m = new ListDocumentModel()

m.insertLocal(0, 2)
m.insertLocal(1, 2)

// Currently, the model looks like this:
// Char 0 - [0]
// Char 1 - [1,0]
// Char 2 - [1,1]
// Char 3 - [1]

const { removals, rclk } = m.removeLocal(0, 2)
removals.forEach(({ start, length }) => {
  console.log(`Removed ${length} elements at position ${start.toString()}`)
})
console.log(`...and all with the vector clock of ${rclk.toString()}!`)
/* Prints:
 * Removed 1 elements at position [0]
 * Removed 1 elements at position [1,0]
 * ...and all with the vector clock of 0!
 */

// Now, the model looks like this:
// Char 0 - [1,1]
// Char 1 - [1]
```

### Putting it Together
Now, with two models...
```javascript
const { ListDocumentModel } = require('./dist/logootish-js.min.js')

const m1 = new ListDocumentModel()
const m2 = new ListDocumentModel()

function dualInsert(pos, len) {
  let { position, length, rclk } = m1.insertLocal(pos, len)
  return m2.insertLogoot(position, length, rclk)
}

function dualRemove(pos, len) {
  let { removals, rclk } = m2.removeLocal(pos, len)
  return removals.map(({ start, length }) => {
    return m1.removeLogoot(start, length, rclk).removals
  })
}

console.log(dualInsert(0, 2))
/* Prints:
 * {
 *   insertions: [ { known_position: 0, offset: 0, length: 2 } ],
 *   removals: []
 * }
 */

console.log(dualInsert(1, 2))
/* Prints:
 * {
 *   insertions: [ { known_position: 1, offset: 0, length: 2 } ],
 *   removals: []
 * }
 */

console.log(dualRemove(0, 2))
/* Prints:
 * [
 *   [ { known_position: 0, length: 1 } ],
 *   [ { known_position: 0, length: 1 } ]
 * ]
 */
```
Note how the positions are always the same as what's passed in as the arguments.
This way, both document models look the same! Finally, note how both removals
have the same `known_position`. This is because they are designed to be applied
in sequence. So once the first element is removed, it's successor becomes the
next one with the `known_position` equal to `0`.

One other thing to note: The `dualInsert` function returns an object with
*removals*. The reason for this may not be obvious at first, but let me explain:
The algorithm allows for these insertions to be out of order. This means that
removals could end up removing the wrong text. The solution is to include a
vector clock (`rclk`) to establish order. However, this can lead to situations
where old data must be removed since it has been replaced. This is what the
`removals` are for -- To remove old text.

### Real Concurrent Edits
Arrays are used here because of the easy `slice` and `splice` functions.
```
const { ListDocumentModel } = require('./dist/logootish-js.min.js')

// First, define two parallel documents. Normally these would be on seperate
// computers or at least seperate processes.
const docs = [
  {
    object: [],
    model: new ListDocumentModel()
  },
  {
    object: [],
    model: new ListDocumentModel()
  }
]

// Define a function to insert `newelements` at `known_position`. The document
// `current` is modified directly and used as a source for the edits, which are
// translated to Logoot positions and used to modify all the `other` documents
function insert(known_position, newelements, current, ...other) {
  // First, add the items locally...
  current.object.splice(known_position, 0, ...newelements)

  // Now, update the model
  const { position, length, rclk } = current.model.insertLocal(
    known_position,
    newelements.length
  )
  
  // Now, let the other models know and update the objects
  other.forEach(({ object, model }) => {
    const { insertions, removals } = model.insertLogoot(position, length, rclk)

    // It is possible that old data (data with a lower vector clock) was added
    // by a past insertion. Here, we remove conflicting old data that is taking
    // the place of our new data.
    // The algorithm ensures that if these positions are modified in the order
    // specified, it will "just work."
    removals.forEach(({ known_position, length }) => {
      // Now, for each segment we have to remove...
      // ... remove it from the object
      object.splice(known_position, length)
    })

    insertions.forEach(({ known_position, offset, length }) => {
      // The thing I didn't mention before was the offset. That's just the start
      // of the section of our source data that we're pulling from.
      const section = newelements.slice(offset, length + offset)
      object.splice(known_position, 0, ...section)
    })
  })
}

// This is pretty much the same as the `insert` function, except it removes
function remove(known_position, length, current, ...other) {
  // First, remove the items locally...
  current.object.splice(known_position, length)

  // Now, update the model
  const { removals, rclk } = current.model.removeLocal(known_position, length)
  
  // Now, let the other models know and update the objects
  // Ok, yeah this is kind of a lot of nesting
  other.forEach(({ object, model }) => { // For each object-model pair...
    removals.forEach(({ start, length }) => { // For each removal...
      const { removals } = model.removeLogoot(start, length, rclk)
      removals.forEach(({ known_position, length }) => {
        // Now, for each segment we have to remove...
        // ... remove it from the object
        object.splice(known_position, length)
      })
    })
  })
}

console.log('First addition:')
insert(0, ['a', 'e', 'f'], docs[0], docs[1])
console.log(docs[0].object)
console.log(docs[1].object)

console.log('Second addition:')
insert(1, ['b', 'c', 'd'], docs[0], docs[1])
console.log(docs[0].object)
console.log(docs[1].object)

console.log('Removal:')
remove(3, 3, docs[0], docs[1])
console.log(docs[0].object)
console.log(docs[1].object)
```
Which prints:
```
First addition:
[ 'a', 'e', 'f' ]
[ 'a', 'e', 'f' ]
Second addition:
[ 'a', 'b', 'c', 'd', 'e', 'f' ]
[ 'a', 'b', 'c', 'd', 'e', 'f' ]
Removal:
[ 'a', 'b', 'c' ]
[ 'a', 'b', 'c' ]
```
And there you have it! Two arrays are made to have the same content even though
edits could be made on different systems. Matrix Notepad is basically the above
code, except...
* The documents are on different systems.
* Both the data from `insertLocal` or `removeLocal` is put into a Matrix event,
along with the `newelements` in the case of insertions.
* There's a fancy GUI.

## Conflicts
Right now, there is no conflict resolution. I have a work-in-progress solution
to this, but it will warrant significant API changes. **Until I get past major
version 0, consider all APIs unstable, as per the
[semantic versioning spec](https://semver.org/).**
