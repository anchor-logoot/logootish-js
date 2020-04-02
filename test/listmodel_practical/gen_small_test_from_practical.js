/**
 * A small script that generates smaller tests out of practical tests that
 * throw an error or fail a self-test. The result will be logged to console
 * and (just a warning) this can take a while. It is a bit poorly written, but
 * it serves its purpose.
 */

const { ListDocumentModel } = require('../../dist/@kb1rd/logootish-js.js')

const practical_t1 = require('./t1')

function findError(chosen_test) {
  const untested = chosen_test.slice()
  const required = []
  while (untested.length) {
    try {
      const next = untested.pop()
      const ldm = new ListDocumentModel()
      const logger = new ListDocumentModel.JsonableLogger()
      logger.restoreFromJSON(untested.concat(required))
      const ops = logger.replayAll(ldm, (ldm, o) => ldm.selfTest())
      required.unshift(next)
    } catch (e) {}
  }
  if (chosen_test.length === required.length) {
    throw new TypeError('Chosen test has no errors')
  }
  return required
}

console.log(JSON.stringify(findError(practical_t1.tests[0])))