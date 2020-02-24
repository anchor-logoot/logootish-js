import chai from 'chai'
import {
  LogootInt,
  LogootPosition,
  ListDocumentModel,
  NodeType
} from '../dist/logootish-js.js'

chai.expect()

const expect = chai.expect

class TestOperationExecuter {
  constructor() {
    this.data = []
  }

  runOperations(ops, origin='') {
    ops.forEach(({ type, start, length, offset, conflicting }) => {
      if (type === 'i') {
        const text = origin.substr(offset, length)
        if (text.length !== length) {
          throw new Error(
            'Algorithm provided out-of-range sections of source data'
          )
        }
        this.data.splice(
          start,
          0,
          ...text.split('').map((data) => ({ data, cfl: false }))
        )
      } else if (type === 'r') {
        const removed = this.data.splice(start, length)
        if (removed !== length) {
          throw new Error(
            'Algorithm provided out-of-range removal'
          )
        }
      } else if (type === 'm') {
        const nodes = this.data.slice(start, start + length)
        if (nodes.length !== length) {
          throw new Error(
            'Algorithm provided out-of-range mark'
          )
        }
        nodes.forEach((n) => {
          n.cfl = conflicting
        })
      } else {
        throw new Error(
          `Algorithm provided invalid type ${type}`
        )
      }
    })
  }

  get string() {
    return this.data.map(({ data }) => data).join('')
  }
  get mark_string() {
    return this.data.map(({ cfl }) => (cfl ? 'c' : ' ')).join('')
  }
}

describe('ListDocumentModel with MinimalJoinFunction', () => {
  const u1 = Symbol('U1')
  const u2 = Symbol('U2')
  const u3 = Symbol('U3')
  let ldm
  let e
  beforeEach('create LDM', () => {
    e = new TestOperationExecuter()
    ldm = new ListDocumentModel(u1)
  })

  describe('_mergeNode', () => {
    describe('basic insertions', () => {
      it('should insert a single node at 0', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        expect(e.string).to.equal('a')
      })
      it('should insert at 0 regardless of original LogootPosition', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1,2,3,4),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        expect(e.string).to.equal('a')
      })
      it('should insert longer nodes', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            5,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'abcde'
        )
        expect(e.string).to.equal('abcde')
      })
      it('should insert for different users w/o conflict', () => {
        e.runOperations(
          ldm._mergeNode(
            u2,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        expect(e.string).to.equal('a')
        expect(e.mark_string).to.equal(' ')
      })
    })
    describe('multi-node', () => {
      it('should insert consecutive nodes', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        expect(e.string).to.equal('ab')
      })
      it('should ignore insertion order', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        expect(e.string).to.equal('ab')
      })
      it('should properly handle different levels', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1, 0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        expect(e.string).to.equal('ab')
      })
    })
    describe('between-node', () => {
      it('two nodes, same level, with flanking space', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(4),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(2),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('two nodes, insertion on lower level', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1,5),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('two nodes, left and insertion on lower level', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1,4),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1,5),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('two nodes, right and insertion on lower level', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1,6),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(1,5),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('should not corrupt start position of lesser', () => {
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(10),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'a'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(11),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'b'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(11,0),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'c'
        )
        e.runOperations(
          ldm._mergeNode(
            u1,
            LogootPosition.fromInts(12),
            1,
            new LogootInt(0),
            NodeType.DATA,
            ldm.canJoin
          ),
          'd'
        )
        expect(e.string).to.equal('acbd')
      })
    })
    it('CGs with same start position should be offset', () => {
      e.runOperations(
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(10),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        ),
        'a'
      )
      e.runOperations(
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(12),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        ),
        'b'
      )
      e.runOperations(
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(9),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        ),
        'b'
      )
      e.runOperations(
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(8),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        ),
        'a'
      )
      e.runOperations(
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(13),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        ),
        'c'
      )
      console.log(ldm.ldoc_bst.toString())
      expect(e.string).to.equal('abc')
    })
  })
})
