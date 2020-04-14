import chai from 'chai'
import {
  LogootInt,
  LogootPosition,
  ListDocumentModel,
  NodeType
} from '../dist/@kb1rd/logootish-js.js'

import practical_t1 from './listmodel_practical/t1'
import practical_t2 from './listmodel_practical/t2'

import lp from './listmodel_practical/local_provider'

chai.expect()

const expect = chai.expect

class TestOperationExecuter {
  constructor() {
    this.data = []
  }

  runOperations(ops, origin='') {
    ops.forEach(({ type, start, length, offset, conflicting, source, dest }) => {
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
        if (removed.length !== length) {
          throw new Error(
            'Algorithm provided out-of-range removal'
          )
        }
      } else if (type === 't') {
        const els = this.data.splice(source, length)
        if (els.length !== length) {
          throw new Error(
            'Algorithm provided out-of-range source translation'
          )
        }
        if (dest > this.data.length) {
          throw new Error(
            'Algorithm provided out-of-range destination translation'
          )
        }
        this.data.splice(dest, 0, ...els)
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
    ldm.agressively_test_bst = true
  })
  const selfTest = () => {
    try {
      ldm.selfTest()
    } catch (e) {
      console.log()
      console.error('Found BST corruption. Dumping BSTs...')
      console.error(ldm.ldoc_bst.toString())
      console.error(ldm.logoot_bst.toString())
      throw e
    }
  }
  const mergeNode = (br, st, ln, rclk, type, jf = ldm.canJoin) => {
    const nomutate_start = st.copy()
    const nomutate_rclk = rclk.copy()
    const ops = ldm._mergeNode(br, nomutate_start, ln, nomutate_rclk, type, jf)
    selfTest()
    if (st.cmp(nomutate_start)) {
      throw new Error('Algorithm mutated input start position')
    }
    if (rclk.cmp(nomutate_rclk)) {
      throw new Error('Algorithm mutated rclk')
    }
    return ops
  }

  const runPracticalTest = (t) => {
    describe(t.name, () => {
      t.tests.forEach((test, i) => {
        it(`test #${i + 1}`, () => {
          const logger = new ListDocumentModel.JsonableLogger()
          logger.restoreFromJSON(test)
          const ops = logger.replayAll(ldm, (ldm, o) => {
            // TODO: Find a way to only display console.logs and debug.logs if
            // a test has failed
            /* console.log()
            console.log('----------------')
            console.log(
              `${o.type} ${o.br}${o.start} + ${o.length} @ ${o.rclk}`
            ) */
            selfTest()
            /* console.log(ldm.ldoc_bst.toString())
            console.log(ldm.logoot_bst.toString()) */
          })
        })
      })
      it('local equivalence test', () => {
        const locals = []
        // A dirty hack to make the branch order constant between LDMs
        const br_order = []
        const ctx = new lp.DummyContext()
        t.tests.forEach((test, i) => {
          locals[i] = new lp.DummyCopy(
            ctx,
            new ListDocumentModel(Symbol()),
            br_order
          )
          const logger = new ListDocumentModel.JsonableLogger()
          logger.restoreFromJSON(test)
          logger.ops.forEach((op) => locals[i].applyOperation(op))
        })
        let last
        const success = locals.every((l) => {
          let rval = true
          if (last) {
            rval = last.doc_eq(l)
          }
          last = l
          return rval
        })
        if (!success) {
          throw new Error('Resulting documents are not equal')
        }
      })
    })
  }

  describe('_mergeNode', () => {
    describe('basic insertions', () => {
      it('should insert a single node at 0', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        expect(e.string).to.equal('a')
      })
      it('should insert at 0 regardless of original LogootPosition', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1,2,3,4),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        expect(e.string).to.equal('a')
      })
      it('should insert longer nodes', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(0),
            5,
            new LogootInt(0),
            NodeType.DATA
          ),
          'abcde'
        )
        expect(e.string).to.equal('abcde')
      })
      it('should insert for different users w/o conflict', () => {
        e.runOperations(
          mergeNode(
            u2,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
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
          mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        expect(e.string).to.equal('ab')
      })
      it('should ignore insertion order', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        e.runOperations(
          mergeNode(
            u2,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        expect(e.string).to.equal('ab')
      })
      it('should properly handle different levels', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1, 0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        expect(e.string).to.equal('ab')
      })
    })
    describe('between-node', () => {
      it('two nodes, same level, with flanking space', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(4),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(2),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('two nodes, insertion on lower level', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1,5),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('two nodes, left and insertion on lower level', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1,4),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1,5),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('two nodes, right and insertion on lower level', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1,6),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(1,5),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'c'
        )
        expect(e.string).to.equal('acb')
      })
      it('should not corrupt start position of lesser', () => {
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(10),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'a'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(11),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'b'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(11,0),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'c'
        )
        e.runOperations(
          mergeNode(
            u1,
            LogootPosition.fromInts(12),
            1,
            new LogootInt(0),
            NodeType.DATA
          ),
          'd'
        )
        expect(e.string).to.equal('acbd')
      })
    })

    // ---------------------------------------------------------------------- //
    // The following tests are ones that I developed to test specific bugs that
    // people have encountered, but I haven't yet made the categories that they
    // would belong to like above. For now, they are here.
    it('CGs with same start position should be offset', () => {
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(10),
          1,
          new LogootInt(0),
          NodeType.REMOVAL
        ),
        'a'
      )
      e.runOperations(
        mergeNode(
          u2,
          LogootPosition.fromInts(12),
          1,
          new LogootInt(0),
          NodeType.REMOVAL
        ),
        'b'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(9),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'b'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(8),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'a'
      )
      e.runOperations(
        mergeNode(
          u2,
          LogootPosition.fromInts(13),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'c'
      )
      expect(e.string).to.equal('abc')
    })
    it('insertion on top of other with lower level in middle', () => {
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(1),
          5,
          new LogootInt(0),
          NodeType.DATA
        ),
        'abceg'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(4,0),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'd'
      )
      e.runOperations(
        mergeNode(
          u2,
          LogootPosition.fromInts(4),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'f'
      )
      expect(e.string).to.match(/^abcd(ef|fe)g$/)
      expect(e.mark_string).to.equal('    cc ')
    })
    it('low level conflict after high level node', () => {
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(3),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'a'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(4,0),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'b'
      )
      e.runOperations(
        mergeNode(
          u2,
          LogootPosition.fromInts(4,0),
          1,
          new LogootInt(0),
          NodeType.DATA
        ),
        'c'
      )
      expect(e.string).to.match(/^a(bc|cb)$/)
      expect(e.mark_string).to.equal(' cc')
    })
    it('node splits shouldn\'t be added with their real known_position', () => {
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(0),
          3,
          new LogootInt(0),
          NodeType.REMOVAL
        ),
        'a'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(4),
          1,
          new LogootInt(0),
          NodeType.REMOVAL
        ),
        'a'
      )
      e.runOperations(
        mergeNode(
          u2,
          LogootPosition.fromInts(3),
          1,
          new LogootInt(0),
          NodeType.REMOVAL
        )
      )
      e.runOperations(
        mergeNode(
          u3,
          LogootPosition.fromInts(1),
          1,
          new LogootInt(1),
          NodeType.DATA
        ),
        'a'
      )
      expect(e.string).to.equal('a')
    })
    it('conflicting old removals', () => {
      e.runOperations(mergeNode(
        u2,
        LogootPosition.fromInts(1),
        1,
        new LogootInt(0),
        NodeType.REMOVAL
      ))
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(1),
          NodeType.DATA
        ),
        'a'
      )
      e.runOperations(mergeNode(
        u2,
        LogootPosition.fromInts(0),
        1,
        new LogootInt(0),
        NodeType.REMOVAL
      ))
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(1),
          1,
          new LogootInt(1),
          NodeType.DATA
        ),
        'b'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(1),
          NodeType.DATA
        ),
        'a'
      )
      e.runOperations(
        mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(1),
          NodeType.DATA
        ),
        'a'
      )
      expect(e.string).to.equal('ab')
      expect(e.mark_string).to.equal('cc')
    })

    describe('practical tests', () => {
      runPracticalTest(practical_t1)
      runPracticalTest(practical_t2)
    })
  })
})
