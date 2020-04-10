/**
 * A small script that generates smaller tests out of practical tests that
 * throw an error or fail a self-test. The result will be logged to console
 * and (just a warning) this can take a while. It is a bit poorly written, but
 * it serves its purpose.
 */

const { ListDocumentModel } = require('../../dist/@kb1rd/logootish-js.js')

const lp = require('./local_provider')

const practical_t1 = require('./t1')

function createOpsFromJSON(json) {
  return json.tests.map((test) => {
    const logger = new ListDocumentModel.JsonableLogger()
    logger.restoreFromJSON(test)
    return logger.ops
  })
}

function deduplicate(ops_list) {
  // It would seem like I should only run this for arrays after the first one,
  // but it is important to remove duplicates in the first list as well as
  // duplicates across the lists
  ops_list.forEach((ops) => {
    ops.forEach((op, i) => {
      const dups = ops_list[0].filter((e) => {
        return e.start.cmp(op.start) === 0 &&
          e.rclk.cmp(op.rclk) === 0 &&
          e.br === op.br &&
          e.length === op.length &&
          e.type === op.type
      })
      if (dups.length > 1) {
        dups.slice(1).forEach((o) => {
          // Duplicates must be removed
          ops.slice(ops.indexOf(o), 1)
        })
      }
      if (dups.length) {
        ops[i] = dups[0]
      } else {
        throw new Error('Tests do not have the same operations')
      }
    })
  })
  return ops_list
}

function _findError(tests) {
  const untested = tests[0].slice()
  const required = []
  while (untested.length) {
    const op_rmd = untested.pop()

    const locals = []
    const ctx = new lp.DummyContext()
    let error = false
    tests.forEach((test, i) => {
      if (error) {
        return
      }
      locals[i] = new lp.DummyCopy(ctx, new ListDocumentModel(Symbol()))
      test.forEach((op) => {
        if (error) {
          return
        }
        if (untested.includes(op) || required.includes(op)) {
          try {
            locals[i].applyOperation(op)
          } catch(e) {
            error = true
          }
        }
      })
    })
    let last
    const success = !error && locals.every((l) => {
      let rval = true
      if (last) {
        rval = last.doc_eq(l)
      }
      last = l
      return rval
    })
    if (success) {
      required.unshift(op_rmd)
    }
  }
  if (tests[0].length === required.length) {
    throw new TypeError('Chosen test has no errors')
  }
  return tests.map((test) => {
    return test.filter((e) => required.includes(e))
  })
}

function findErrorInJSON(json) {
  const opsets = _findError(deduplicate(createOpsFromJSON(json)))
  return opsets.map((ops) => {
    const logger = new ListDocumentModel.JsonableLogger()
    logger.ops = ops
    return logger.toJSON()
  })
}

findErrorInJSON(practical_t1).forEach((j) => {
  console.log(JSON.stringify(j))
})