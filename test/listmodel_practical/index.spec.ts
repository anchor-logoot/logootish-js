import { expect } from 'chai'
import { BranchOrder } from '../../src/listmodel/branch'
import { ListDocumentModel, InsertionOperation } from '../../src/listmodel'
import RI from './random_insertions'

describe('ListDocumentModel practical (these generally take a while)', () => {
  let o: BranchOrder
  let ldm: ListDocumentModel
  const setupLdm = () => {
    ldm = new ListDocumentModel(o)
    ldm.opts.agressively_test_bst = true
  }
  beforeEach(() => {
    o = new BranchOrder()
    setupLdm()
  })
  describe('random insertions', () => {
    const runOperations = (ops) => {
      ops.forEach(({ p, l, u }) => {
        const { left, right, clk, length } = ldm.insertLocal(p, l)
        const ops = ldm.insertLogoot(u, left, right, length, clk)
        ldm.selfTest()
        expect(ops.length).to.be.equal(1)
        expect(ops[0].type).to.be.equal('i')
        expect(ops[0].start).to.be.equal(p)
        expect((ops[0] as InsertionOperation).offset).to.be.equal(0)
        expect(ops[0].length).to.be.equal(l)
      })
    }
    const findMvt = (ops) => {
      const untested = [...ops]
      const required = []
      while (untested.length) {
        try {
          setupLdm()
          runOperations(required)
        } catch (e) {
          return required
        }
        required.push(untested.shift())
      }
      return required
    }

    RI.forEach(({ ops, n_users }, i) => {
      it(`test ${i}`, () => {
        ([...new Array(n_users)]).forEach((v, i) => {
          o.i(`U${i + 1}`)
        })
        try {
          runOperations(ops)
        } catch (e) {
          console.log('Error caught. Finding MVT...')
          const mvt = findMvt(ops)
          console.log(`Hint: Minimum Viable Test is:`)
          console.log(`LDOC: ${JSON.stringify(mvt)}`)
          setupLdm()
          const logoot_mvt = mvt.map(({ p, l, u }) => {
            const { left, right, clk, length } = ldm.insertLocal(p, l)
            ldm.insertLogoot(u, left, right, length, clk)
            return { a: { l: left, r: right }, c: clk, l: length, u }
          })
          console.log(`LOGOOT: ${JSON.stringify(logoot_mvt)}`)
          console.log()
          throw e
        }
      })
    })
  })
})