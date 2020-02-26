const events = require(process.argv[2])
const { EventAbstractionLayer } = require('./eventproc.js')
const eal = new EventAbstractionLayer('@kb1rd:kb1rd.net')

function next() {
  const e = events.splice(0, 1)[0]
  console.dir(e, { depth: null })
  const rval = eal.processEvent(e)
  console.log(eal.listdoc.ldoc_bst.toString())
  eal.listdoc.selfTest()
  console.log()
  return rval
}

while (events.length) {
  next()
}
