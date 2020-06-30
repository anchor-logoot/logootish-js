/**
 * @file Performs pseudorandom tests on the LDM. My unit tests *should* be
 * perfect. They test every possible condition. However, it is possible to make
 * mistakes and I often find myself with areas that have 100% test coverage,
 * but don't catch every bug. Practical tests are designed to be pre-production
 * catch-all tests. They are **not** designed to help debugging, only in bug
 * *catching*. So, when a bug is found, first another non-practical unit test
 * is made from it. Then, the tests are run with `yarn test:nopractical` to
 * cut out the practical tests. These tests are also skipped by the code
 * coverage calculator (normal tests should get 100% coverage) and the Webpack
 * file watcher (actual bugfix work should never be done using practical
 * testing).
 * 
 * To aid in the identification of bugs, these tests have an added feature: The
 * ability to identify MVTs (Minimum Viable Tests). These are the minimum tests
 * that will throw an error. If `yarn run test:mvt` is run, when an error is
 * encountered, such a result will be determined and printed to console.
 * 
 * Now, for the tests actually in here: Random order equality tests that a set
 * of Logoot operations will result in an identical document regardless of the
 * order of these operations. Random insertions and/or removals tests for any
 * differences between the local operation performed and what the LDM spits
 * out. This must be done in order. Conflicts are always enabled unless
 * otherwise stated.
 * 
 * Finally, all tests involving conflicts are force-disabled ATM by a simple
 * `return` statement. This file is also in desperate need of refactoring.
 * 
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { expect } from 'chai'
import random from 'random'
import seedrandom from 'seedrandom'
import { BranchOrder } from '../src/listmodel/branch'
import {
  ListDocumentModel,
  Operation,
  InsertionOperation
} from '../src/listmodel'

/**
 * Despite these tests having 'random' input data, they **must** be the same,
 * so a PRNG must be used. It's easiest to store possible seeds globally. Seeds
 * may (and should) be re-used, just not for the same type of test.
 */
const global_seeds = ['ol7fooXe', 'taeN5Gei', 'Shee3rie', 'Einguch6']

const should_run_mvt = process.env['FIND_MVT'] === '1'

class VirtualLdoc {
  template_state: Symbol[] = []
  doc: Symbol[] = []
  symbols = 0
  processOperation(
    origin_data: Symbol[],
    op: Operation
  ): void {
    switch (op.type) {
      case 'i':
        if (op.start > this.doc.length || op.start < 0) {
          throw new TypeError('Insertion out of local document range')
        }
        const data = origin_data.slice(op.offset, op.offset + op.length)
        if (data.length !== op.length) {
          throw new TypeError('Not enough source data for insertion')
        }
        this.doc.splice(op.start, 0, ...data)
        break
      case 'r':
        const old = this.doc.splice(op.start, op.length)
        if (old.length !== op.length) {
          throw new TypeError('Removal is out of document range')
        }
        break
    }
  }
  nextSymbol(): Symbol {
    this.symbols++
    return Symbol(`LOC${this.symbols}`)
  }
  *symbol(): IterableIterator<Symbol> {
    while (true) {
      yield this.nextSymbol()
    }
  }
  provideSymbols(n: number): Symbol[] {
    return [...Array(n)].map(() => this.nextSymbol())
  }
  flush(): void {
    this.doc.length = 0
  }
  pushTemplate(): void {
    this.template_state = [...this.doc]
  }
  expectEqualTemplate(): void {
    expect(this.doc).to.be.deep.equal(this.template_state)
  }
}

function reorderArray<T>(a: T[], rand = random) {
  let length = a.length
  while (length > 0) {
    a.push(...a.splice(rand.int(0, length--), 1))
  }
  return a
}

function findMinFailingUnordered<T>(
  ops: T[],
  test: (op: T) => void,
  reset: () => void
): T[] {
  const to_test: T[] = [...ops]
  const required: T[] = []
  while (to_test.length) {
    reset()
    const op = to_test.pop()
    try {
      [...to_test, ...required].forEach(test)
      required.unshift(op)
    } catch(e) {}
  }
  return required
}

describe('ListDocumentModel practical (these generally take a while)', () => {
  let o: BranchOrder
  let ldm: ListDocumentModel
  const setupLdm = () => {
    ldm = new ListDocumentModel(o)
    ldm.opts.agressively_test_bst = true
    ldm.opts.disable_conflicts = false
  }
  const mvtTest = (n_ops: number, seed: string, nextOperation) => {
    const rand = random.clone(seed)
    try {
      let vdoc_len = 0
      ;[...new Array(n_ops)].forEach(() => {
        vdoc_len = nextOperation(rand, vdoc_len)
      })
    } catch (e) {
      console.log('Error caught. Finding MVT (this could take a LONG time)...')
      const rand = random.clone(seed)
      let breaking_n_ops = 1
      let run = true
      let vdoc_len = 0
      while (run) {
        try {
          vdoc_len = nextOperation(rand, vdoc_len)
          breaking_n_ops += 1
        } catch(e) {
          run = false
        }
      }
      console.log(`MVT has ${breaking_n_ops} operations with seed ${seed}`)
      console.log()
      throw e
    }
  }

  const randomInsertion = (rand, vdoc_len) => ({
    type: 'i',
    start: rand.int(0, vdoc_len),
    length: rand.int(1, 10),
    br: o.b(rand.int(0, o.length - 1))
  })
  const randomRemoval = (rand, vdoc_len) => {
    const rm_start = rand.int(0, vdoc_len - 1)
    return {
      type: 'r',
      start: rm_start,
      length: Math.min(rand.int(1, 10), vdoc_len - rm_start),
      br: o.b(rand.int(0, o.length - 1))
    }
  }
  const generateLogootOps = (
    rand,
    n: number,
    noRemovals = false,
    onop?,
    ldoc?: VirtualLdoc
  ) => {
    let vdoc_len = 0
    return [...new Array(n)].flatMap(() => {
      if (vdoc_len < 0) {
        throw new Error('Virtual length cannot be less than zero')
      }
      if (vdoc_len === 0 || noRemovals || rand.bool()) {
        const { start, length: ilen, br } = randomInsertion(rand, vdoc_len)
        const i = ldm.insertLocal(start, ilen)
        const ni = {
          left: i.left,
          right: i.right,
          length: i.length,
          br,
          clk: i.clk,
          origin_data: ldoc && ldoc.provideSymbols(i.length)
        }
        if (onop) onop(ni)
        const ldoc_ops = ldm.insertLogoot(
          ni.br,
          i.left,
          i.right,
          i.length,
          i.clk
        )
        if (ldoc) {
          ldoc_ops.forEach((op) => ldoc.processOperation(ni.origin_data, op))
        }
        vdoc_len += i.length
        ldm.selfTest()
        return [ni]
      } else {
        const { start, length } = randomRemoval(rand, vdoc_len)
        const rs = ldm.removeLocal(start, length)
        if (onop) rs.forEach(onop)
        rs.forEach((rm) => {
          const ldoc_ops = ldm.removeLogoot(rm.start, rm.length, rm.clk)
          if (ldoc) {
            ldoc_ops.forEach((op) => ldoc.processOperation([], op))
          }
        })
        vdoc_len -= length
        ldm.selfTest()
        return rs
      }
    })
  }

  const runLogootOps = (ops, ldoc?: VirtualLdoc) => {
    ops.forEach((op) => {
      let ldoc_ops: Operation[]
      if (op.start) {
        // Is a removal
        ldoc_ops = ldm.removeLogoot(op.start, op.length, op.clk)
      } else {
        // Is an insertion
        ldoc_ops = ldm.insertLogoot(op.br, op.left, op.right, op.length, op.clk)
      }
      if (ldoc) {
        ldoc_ops.forEach(
          (ldop) => ldoc.processOperation(op.origin_data || [], ldop)
        )
      }
      ldm.selfTest()
    })
  }

  describe('random order equality, no conflict', () => {
    const ncSetupLdm = () => {
      setupLdm()
      ldm.opts.disable_conflicts = true
    }

    const onOperationsError = (original_ops) => {
      if (!should_run_mvt) {
        return
      }
      console.log(`Error, finding MVT from ${original_ops.length} operations`)
      console.log(
        'Finding MVTs can take a LOOOOOOONG time, so feel free to take a nap'
      )
      const minops = findMinFailingUnordered(
        original_ops,
        (op) => runLogootOps([op]),
        () => {
          ncSetupLdm()
        }
      )
      ncSetupLdm()
      try {
        minops.forEach((op) => {
          console.log(JSON.stringify(op))
          runLogootOps([op])
          console.log(ldm.bst.toDeepString())
          console.log(ldm.bst.toString())
        })
      } catch(e) {
        console.log('ERROR', ldm.bst.toDeepString())
        console.log('ERROR', ldm.bst.toString())
        console.log(e)
      }
      console.log('Minimum Viable Test is: ', JSON.stringify(minops))
    }

    let ldoc: VirtualLdoc
    const runTests = (seed: string, tests: number, n_op: number) => {
      let original_ops
      it('generates operations', () => {
        o = new BranchOrder()
        o.i('U1')
        o.i('U2')
        o.i('U3')
        ncSetupLdm()
        ldoc = new VirtualLdoc()

        original_ops = []
        try {
          random.use(seedrandom(seed))
          generateLogootOps(
            random,
            n_op,
            false,
            (op) => original_ops.push(op),
            ldoc
          )
          ldoc.pushTemplate()
        } catch(e) {
          onOperationsError(original_ops)
          throw e
        }
      })

      let ops
      for (let i = 0; i < tests; i++) {
        it(`order #${i + 1}`, () => {
          ncSetupLdm()
          ldoc.flush()
          if (!original_ops) {
            throw new Error('Operations not defined')
          }
          ops = reorderArray([...original_ops])
          try {
            runLogootOps(ops, ldoc)
          } catch (e) {
            onOperationsError(original_ops)
            throw e
          }
          try {
            ldoc.expectEqualTemplate()
          } catch (e) {
            console.error(
              'Local documents are not equal. Currently, there is no MVT for' +
              'finding equality issues.'
            )
            throw e
          }
        })
      }
    }

    global_seeds.forEach((seed, i) => {
      describe(`test #${i + 1}`, () => {
        runTests(seed, 4, 256)
      })
    })
  })

  return // Conflicts currently disabled :(
  describe('random insertions', () => {
    return
    beforeEach(() => {
      o = new BranchOrder()
      o.i('U1')
      o.i('U2')
      o.i('U3')
      setupLdm()
    })
    const nextOperation = (rand, vdoc_len: number) => {
      const i = randomInsertion(rand, vdoc_len)
      const { left, right, clk, length } = ldm.insertLocal(i.start, i.length)
      const ops = ldm.insertLogoot(i.br, left, right, length, clk)
      ldm.selfTest()
      expect(ops.length).to.be.equal(1)
      expect(ops[0].type).to.be.equal('i')
      expect(ops[0].start).to.be.equal(i.start)
      expect((ops[0] as InsertionOperation).offset).to.be.equal(0)
      expect(ops[0].length).to.be.equal(i.length)
      return vdoc_len + i.length
    }

    global_seeds.forEach((seed, i) => {
      it(`test ${i}`, () => {
        mvtTest(32, seed, nextOperation)
      })
    })
  })

  describe('random insertions/removals', () => {
    return
    beforeEach(() => {
      o = new BranchOrder()
      o.i('U1')
      o.i('U2')
      o.i('U3')
      setupLdm()
    })
    const nextOperation = (rand, vdoc_len: number) => {
      if (rand.bool()) {
        const i = randomInsertion(rand, vdoc_len)
        const { left, right, clk, length } = ldm.insertLocal(i.start, i.length)
        const ops = ldm.insertLogoot(i.br, left, right, length, clk)
        ldm.selfTest()
        expect(ops.length).to.be.equal(1)
        expect(ops[0].type).to.be.equal('i')
        expect(ops[0].start).to.be.equal(i.start)
        expect((ops[0] as InsertionOperation).offset).to.be.equal(0)
        expect(ops[0].length).to.be.equal(i.length)
        return vdoc_len + i.length
      } else {
        const r = randomRemoval(rand, vdoc_len)
        const logoot_rms = ldm.removeLocal(r.start, r.length)
        const rms = logoot_rms.flatMap(({ start, length, clk }) => {
          const rval = ldm.removeLogoot(start, length, clk)
          ldm.selfTest()
          return rval
        })
        const dummy_array = [...new Array(r.start + r.length)].map((v, i) => i)
        const expected_array = dummy_array.slice(0, r.start)
        rms.forEach(({ type, start, length }) => {
          expect(type).to.be.equal('r')
          expect(dummy_array.splice(start, length).length)
            .to.be.equal(length)
        })
        expect(dummy_array).to.be.deep.equal(expected_array)
        return vdoc_len - r.length
      }
    }

    global_seeds.forEach((seed, i) => {
      it(`test ${i}`, () => {
        mvtTest(32, seed, nextOperation)
      })
    })
  })
})