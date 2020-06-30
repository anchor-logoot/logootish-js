#!/usr/bin/env node

/**
 * @file Performance tests run by 0x to generate flame graphs. These test
 * local/logoot insertions/removals **without** conflicts. This is written
 * in plain JS for a few reasons: ATM, I'm not generating TypeScript output,
 * just `.js` files. If I just use JS, I can run the `.min.js` files and get
 * real performance data. In addition, getting babel-node to work is a real
 * PITA and most guides/answers I can find online are for old babel versions.
 * 
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

const random = require('random')
const seedrandom = require('seedrandom')
const {
  ListDocumentModel,
  BranchOrder
} = require('../dist/@kb1rd/logootish-js.js')

const settings = {
  name: 'ListDocumentModel "No Conflict" Performance Test',
  seed: 'ol7fooXe',
  iter: 1024,
  ins: {
    minlen: 1,
    maxlen: 10
  },
  rem: {
    minlen: 1,
    maxlen: 5
  },
  branches: 3
}

if (process.argv[2] === '--name') {
  console.log(settings.name)
  process.exit(0)
}

const start = new Date()
test()
const end = new Date()
console.log(`Finished test '${settings.name}' in ${end - start} ms.`)
console.log(
  `That's an average of ${(end - start) / settings.iter}ms per operation.`
)


function test() {
  const o = new BranchOrder()
  for (let i = 0; i < settings.branches; i++) {
    o.i(`U${i + 1}`)
  }
  const ldm = new ListDocumentModel()
  // Self-testing is entirely disabled
  ldm.opts.agressively_test_bst = false
  ldm.opts.disable_conflicts = true

  const randomInsertion = (vdoc_len) => ({
    type: 'i',
    start: random.int(0, vdoc_len),
    length: random.int(1, 10),
    br: o.b(random.int(0, o.length - 1))
  })
  const randomRemoval = (vdoc_len) => {
    const { minlen, maxlen } = settings.rem
    const rm_start = random.int(0, vdoc_len - 1)
    return {
      type: 'r',
      start: rm_start,
      length: Math.min(random.int(minlen, maxlen), vdoc_len - rm_start),
      br: o.b(random.int(0, o.length - 1))
    }
  }

  random.use(seedrandom(settings.seed))
  let vdoc_len = 0
  for (let i = 0; i < settings.iter; i++) {
    if (vdoc_len < 0) {
      throw new Error('Virtual length cannot be less than zero')
    }
    if (vdoc_len === 0 || random.bool()) {
      const { start, length: ilen, br } = randomInsertion(vdoc_len)
      const i = ldm.insertLocal(start, ilen)
      ldm.insertLogoot(
        br,
        i.left,
        i.right,
        i.length,
        i.clk
      )
      vdoc_len += i.length
    } else {
      const { start, length } = randomRemoval(vdoc_len)
      ldm.removeLocal(start, length).forEach(
        (rm) => ldm.removeLogoot(rm.start, rm.length, rm.clk)
      )
      vdoc_len -= length
    }
  }
}