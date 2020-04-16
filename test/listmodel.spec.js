import chai from 'chai'
import {
  LogootInt,
  LogootPosition,
  ListDocumentModel,
  NodeType,
  InsertionConflictError
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

  describe('insertLocal', () => {
    const basicInsertionTest = (s, l, pos = [0], r = 0) => {
      const fromInts = LogootPosition.fromInts
      const { start, length, br, rclk } = ldm.insertLocal(s, l)
      expect(start.cmp(fromInts(...pos)))
        .to.be.equal(0, `Start position must be ${pos}`)
      expect(length).to.be.equal(l, 'Length must be conserved')
      expect(br).to.be.equal(ldm.branch, 'Must insert on LDM branch')
      expect(rclk.cmp(new LogootInt(r)))
        .to.be.equal(0, `Lamport clock must be ${r}`)
    }
    describe('single-node operations', () => {
      it('Return types are correct', () => {
        const { start, length, br, rclk } = ldm.insertLocal(0, 1)
        expect(start).to.be.an.instanceof(LogootPosition)
        expect(length).to.be.a('number').to.be.at.least(0).to.be.finite
        // TODO: Looks like chai can't test if `br` is one of an array of types
        expect(rclk).to.be.an.instanceof(LogootInt)
      })
      it('Insert @ 0', () => {
        basicInsertionTest(0, 1)
      })
      it('Longer insertion @ 0', () => {
        basicInsertionTest(0, 5)
      })
      it('Incorrect insert @ 1 should fail', () => {
        expect(() => ldm.insertLocal(1, 1), 'Should throw error')
          .to.throw(TypeError)
      })
      it('insert @ -1 should fail', () => {
        expect(() => ldm.insertLocal(-1, 1), 'Should throw error')
          .to.throw(TypeError)
      })
      it('insert with length 0 should fail', () => {
        expect(() => ldm.insertLocal(0, 0), 'Should throw error')
          .to.throw(TypeError)
      })
    })

    describe('insertion with other node', () => {
      it('Insert after node', () => {
        ldm._mergeNode(
          ldm.branch,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 1, [1])
      })
      it('Insert before node', () => {
        ldm._mergeNode(
          ldm.branch,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(0, 1, [-1])
      })
      it('Insert after node w/ length', () => {
        ldm._mergeNode(
          ldm.branch,
          LogootPosition.fromInts(0),
          2,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(2, 3, [2])
      })
      it('Insert in middle of node', () => {
        ldm._mergeNode(
          ldm.branch,
          LogootPosition.fromInts(0),
          2,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 2, [1,0])
      })
      it('Incorrect insert after node should fail', () => {
        ldm._mergeNode(
          ldm.branch,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        expect(() => ldm.insertLocal(2, 1), 'Should throw error')
          .to.throw(TypeError)
      })
      it('Insert after other user node', () => {
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          2,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(2, 2, [2])
      })
    })

    describe('involving conflicts', () => {
      it('Insert between non-joined nodes', () => {
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u3,
          LogootPosition.fromInts(1),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 2, [1,0])
      })
      it('Insert in middle of other conflict should throw ICE', () => {
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          2,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        expect(() => ldm.insertLocal(1, 3), 'Should throw ICE')
          .to.throw(InsertionConflictError)
      })
      it('Insert after conflict should be ok', () => {
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u3,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(2, 2, [1])
      })
      it('Insert between different branch conflicts should throw ICE', () => {
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u3,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        expect(() => ldm.insertLocal(1, 3), 'Should throw ICE')
          .to.throw(InsertionConflictError)
      })
      it('Insert between conflicting current branch & other', () => {
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 2, [1])
      })
      it('Insert between conflicting current with NC current after', () => {
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(0),
          2,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 2, [1,0])
      })
    })

    describe('with removals', () => {
      it('removal nodes should be ignored', () => {
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        )
        basicInsertionTest(0, 1, [0])
      })
      it('removals at start of CG should be ignored', () => {
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        )
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(1),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(0, 1, [0])
      })
      it('insert on top of removal with neighbors', () => {
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(1),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        )
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(2),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 1, [1])
      })
      it('insert on top of removal with neighbors in different CGs', () => {
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(0),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        ldm._mergeNode(
          u1,
          LogootPosition.fromInts(1),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        )
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(2),
          1,
          new LogootInt(0),
          NodeType.REMOVAL,
          ldm.canJoin
        )
        ldm._mergeNode(
          u2,
          LogootPosition.fromInts(3),
          1,
          new LogootInt(0),
          NodeType.DATA,
          ldm.canJoin
        )
        basicInsertionTest(1, 2, [1])
      })
    })
  })

  describe('removeLocal', () => {
    const basicRemovalTest = (s, l, correct_removals) => {
      const { removals } = ldm.removeLocal(s, l)
      expect(removals.length)
        .to.be.equal(correct_removals.length, 'Incorrect number of removals')
      const fromInts = LogootPosition.fromInts
      removals.forEach((r, i) => {
        const c = correct_removals[i]
        expect(r.start.cmp(fromInts(...c.s)))
          .to.be.equal(0, `Start position for removal ${i} must be ${c.s}`)
        expect(r.length)
          .to.be.equal(c.l, `Length for removal ${i} must be ${c.l}`)
        expect(r.branch)
          .to.be.equal(c.b, `Branch for removal ${i} must be ${c.b.toString()}`)
        expect(r.rclk.cmp(new LogootInt(c.r)))
          .to.be.equal(0, `Lamport clock for removal ${i} must be ${c.r}`)
        
      })
    }
    it('Return types are correct', () => {
      ldm._mergeNode(
        ldm.branch,
        LogootPosition.fromInts(0),
        1,
        new LogootInt(0),
        NodeType.DATA,
        ldm.canJoin
      )
      const { removals } = ldm.removeLocal(0, 1)
      expect(removals).to.be.an('array')
      expect(removals.length).to.be.equal(1)

      const { branch, start, length, rclk } = removals[0]
      // Unable to test; AFAIK, Chai doesn't support testing to see if a type
      // is one of any
      // expect(branch)
      expect(start).to.be.an.instanceof(LogootPosition)
      expect(length).to.be.a('number').to.be.at.least(0).to.be.finite
      expect(rclk).to.be.an.instanceof(LogootInt)
    })
    it('remove single node', () => {
      ldm._mergeNode(
        u2,
        LogootPosition.fromInts(1,2,3),
        3,
        new LogootInt(5),
        NodeType.DATA,
        ldm.canJoin
      )
      basicRemovalTest(0, 2, [{s: [1,2,3], l: 2, b: u2, r: 5}])
    })
    it('invalid removal after end', () => {
      ldm._mergeNode(
        u2,
        LogootPosition.fromInts(0),
        1,
        new LogootInt(0),
        NodeType.DATA,
        ldm.canJoin
      )
      expect(() => ldm.removeLocal(1, 1), 'Should throw error')
        .to.throw(TypeError)
    })
    it('remove multiple nodes', () => {
      ldm._mergeNode(
        u2,
        LogootPosition.fromInts(0),
        2,
        new LogootInt(0),
        NodeType.DATA,
        ldm.canJoin
      )
      ldm._mergeNode(
        u3,
        LogootPosition.fromInts(2),
        3,
        new LogootInt(1),
        NodeType.DATA,
        ldm.canJoin
      )
      basicRemovalTest(0, 4, [
        {s: [0], l: 2, b: u2, r: 0},
        {s: [2], l: 2, b: u3, r: 1}
      ])
    })
    it('remove multiple nodes with start offset', () => {
      ldm._mergeNode(
        u2,
        LogootPosition.fromInts(0),
        2,
        new LogootInt(0),
        NodeType.DATA,
        ldm.canJoin
      )
      ldm._mergeNode(
        u3,
        LogootPosition.fromInts(2),
        3,
        new LogootInt(1),
        NodeType.DATA,
        ldm.canJoin
      )
      basicRemovalTest(1, 4, [
        {s: [1], l: 1, b: u2, r: 0},
        {s: [2], l: 3, b: u3, r: 1}
      ])
    })
  })

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
