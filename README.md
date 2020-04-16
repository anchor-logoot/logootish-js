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

## Design Philosophy
This implementation of the algorithm is designed with the philosophy of
separating out all that can be separated. Because of this, `logootish-js`
never actually touches the data that it manipulates: it only deals with a
description of that data. In the `ListDocumentModel` (a Loogoot-like sequence
document), this means that the algorithm recieves only position, length,
Lamport clocks, and branches for each operation (where applicable). It is up to
the application using `logootish-js` to decide what data to manipulate and how
to manipulate it. This way, the `ListDocumentModel` can be used for arrays,
strings, and rich text. The same will be true for a (spolier alert!)
`MapDocumentModel` when that is created.

The `logootish-js` codebase was forked out of
[Matrix Notepad](https://matrix-notepad.kb1rd.net) and shortly thereafter,
converted to TypeScript. This is by far the most complex and important part of
the notepad.

Currently, `logootish-js` only supports the `ListDocumentModel` type. Other
CRDT building blocks will be added in the future.

### ListDocumentModel
[Notepad Wiki](https://github.com/KB1RD/matrix-notepad/wiki/Logootish)
[TypeDoc](https://logootish-js.matrix-notepad.kb1rd.net/modules/_listmodel_index_.html)

Note that the Wiki contains information for the over-Matrix protocol used to
transfer Logootish operations. That is not part of this library.

The `ListDocumentModel` contains a mapping of Logootish (custom algorithm)
positions to text positions in the local document. It is capable of
bi-directional mappings. The Logoot equivalent of a local insertion is
determined through the `insertLocal` method and the Logoot equivalent of a
local removal is determined through the `removeLocal` function. The local
operations that must be performed for a given Logoot operation are determined
by the `insertLogoot` and `removeLogoot` methods, respectively.

Conflict resolution is mostly implemented, but mark operations need to be fixed
(issues #11 and #12) before that's ready for normal usage.

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
Unfortunately, the last update changed most of the examples I had here. I will
eventually put new usage examples here and describe the architecture.
