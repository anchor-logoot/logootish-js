/**
 * Runs a test (in `JsonableLogger` format) and prints the step-by-step results
 * to console.
 */

const { ListDocumentModel } = require('../../../dist/@kb1rd/logootish-js')

if (!process.argv[2]) {
  console.log(
    `Usage: ${process.argv[1]} <JSON>
    <JSON> - The JSON string to test. This is in the same format exported by
      JsonableLogger`
  )
  process.exit(1)
}

const test = JSON.parse(process.argv[2])

const ldm = new ListDocumentModel()
ldm.agressively_test_bst = true
const logger = new ListDocumentModel.JsonableLogger()
logger.restoreFromJSON(test)
logger.replayAll(ldm, (ldm, o, ops) => {
  console.log()
  console.log('----------------')
  console.log(
    `${o.type} ${o.br}${o.start} + ${o.length} @ ${o.rclk}`
  )
  let vdoc_length
  ops.forEach((op) => {
    if (op.type === 'i') {
      const { start, offset, length } = op
      console.log(`I D[${offset}...${length}] -> ${start}`)
      if (start > vdoc_length || start < 0) {
        throw new Error('Start of insertion is out of range')
      }
      if (length > o.length) {
        throw new Error('Insertion length is greater than available data')
      }
      vdoc_length += length
    } else if (op.type === 'r') {
      const { start, length } = op
      console.log(`R ${start} + ${length}`)
      if (start + length > vdoc_length || start < 0) {
        throw new Error('Removal is out of range')
      }
      vdoc_length -= length
    } else if (op.type === 't') {
      const { source, dest, length } = op
      console.log(`T ${source} + ${length} -> ${dest}`)
      if (source + length > vdoc_length || source < 0) {
        throw new Error('Source of translation is out of range')
      }
      if (dest > vdoc_length - length || dest < 0) {
        throw new Error('Destination of insertion is out of range')
      }
    } else if (op.type === 'm') {
      const { start, conflicting, length } = op
      console.log(`M ${start} + ${length} ${conflicting ? 'C' : 'NC'}`)
      if (start + length > vdoc_length || start < 0) {
        throw new Error('Mark is out of range')
      }
    }
  })
  ldm.selfTest()
  console.log(ldm.ldoc_bst.toString())
  // Most of the time, this doesn't need to be logged
  // console.log(ldm.logoot_bst.toString())
})