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
Unfortunately, the last update changed most of the examples I had here. I will
eventually put new usage examples here and describe the architecture.
