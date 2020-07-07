# Logootish
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/kb1rd/logootish-js)
![Matrix](https://img.shields.io/matrix/matrix-collaboration:kb1rd.net?label=chat%20on%20%23matrix-collaboration%3Akb1rd.net&server_fqdn=matrix.org)
![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/KB1RD/logootish-js/Yarn%20CI/dev?label=dev%20build%2Ftest)
![GitHub](https://img.shields.io/github/license/kb1rd/logootish-js)

The Logootish CRDT algorithm used by the Matrix Notepad. See the documentation
[on the Notepad wiki](https://github.com/KB1RD/matrix-notepad/wiki/Logootish)
for information about the algorithm and the [TypeDoc](https://logootish-js.matrix-notepad.kb1rd.net/)
Currently, this is only used in `matrix-notepad`, but the code is generic
enough that it could be used in any collaboration system. At the moment, this
only contains an implementation of an algorithm that I call AnchorLogoot.

Based on https://github.com/krasimir/webpack-library-starter

## Design Philosophy
This algorithm, in contrast to others such as
[Automerge](https://github.com/automerge/automerge) or
[Y.js](https://github.com/yjs/yjs) is both data *and* network agnostic. This
means that the `ListDocumentModel` contained here can be used for any ordered
list that allows duplication, such as a `string`, array, or a rich text data
type. This *does* mean that it's up to you to perform operations on whatever
your data model is, but it's quite easy. However, if you want to save the state
(in IndexedDB or wherever), you will have to implement this yourself. If you
are interested in using this in your own project, **please submit an issue to
request that I clear up the documentation.** I'm focusing on making the Nodepad
work, so docs here are not at the top of my priority list.

The `logootish-js` codebase was forked out of
[Matrix Notepad](https://matrix-notepad.kb1rd.net) and, shortly thereafter,
converted to TypeScript. This is by far the most complex and important part of
the Notepad.

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
(issues #11 and #12) before that's ready for normal usage. A new algorithm has
been created known as "Anchor Logoot." This is not compatible with previous
versions below `0.4.0`. Currently, conflict creation is experimental and is
only implemented in the model. Mark operations are not created yet.

## Performance
Most of my time has been spent making this work in the first place. Because of
that, it's a bit slow, but there are a few areas where it can be easily sped up
(see the issues). I also have my CI generating flamegraph(s), such as the one
[here](https://logootish-js.matrix-notepad.kb1rd.net/flamegraph/test/listmodel-nc.perf.js/flamegraph.html#{%22merged%22:true,%22nodeId%22:null,%22excludeTypes%22:[%22cpp%22,%22regexp%22,%22v8%22,%22native%22,%22init%22,%22core%22]}).

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
```

## Usage
Unfortunately, the last update broke most of the examples I had here. I will
eventually put new usage examples here and describe the architecture.
