# Logootish
The Logootish algorithm used by the Matrix Notepad. See the documentation
[on the wiki.](https://github.com/KB1RD/matrix-notepad/wiki/Logootish) Currently, this
is only used in `matrix-notepad`, but the code is generic enough that it could
be used in any collaboration system. Right now, it's not stable enough for that
yet.

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

# Link it so that you can build packages locally
yarn link
```

## Usage
Currently, the `Document` class is most useful. A `Document` is an in-memory
mapping of consecutive positions to Logoot positions. The document does not
actually store the text -- That's up to you to handle. Here's an example of
how to use it:
```javascript
const doc = new Document(
  (event) => {
    console.log('send', event.toJSON())
    return Promise.resolve()
  },
  () => undefined,
  () => undefined
)

doc.insert(0, 'hi')
// Prints send { body: 'hi', start: [0], rclk: 0 }
```

I know this is super brief, but I'm planning to restructure most of this. When I
get around to doing that, I'll write a more comprehensive intro. In the mean
time, feel free to poke around the JSDoc, though it's probably not super
helpful. Most of what you'll want to see in the JSDoc is under "index." All the
other files are just support code.
