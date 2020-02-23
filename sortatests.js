/* const { Bst, RangeSearch } = require('./dist/logootish-js.js')

const cf = (a, b) => a > b ? 1 : (a < b ? -1 : 0)

const bst = new Bst(cf)
bst.add(5)
bst.add(3)
bst.add(7)
bst.add(8)
bst.add(2)
bst.add(4)
bst.add(6)
console.log(bst.toString())
console.log(bst.bst_root)

const rs = bst.create_range_search()
rs.lesser_find_greatest = true
rs.greater_find_least = true
rs.push_point(3, 'a', true)
rs.push_point(6, 'b', false)
rs.last_bucket = 'c'


console.log(bst.search(rs)) */

const { ListDocumentModel, NodeType, LogootPosition, LogootInt } = require('./dist/logootish-js.js')

const b1 = Symbol('Branch 1')

const m = new ListDocumentModel(b1)

m.insertLogoot(b1, LogootPosition.fromInts(0), 1, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(1), 1, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(2), 1, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(3), 1, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(4), 4, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(8), 5, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(13), 5, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(18), 5, new LogootInt(0))
m.insertLogoot(b1, LogootPosition.fromInts(23), 4, new LogootInt(0))
console.log(m.ldoc_bst.toString())


m.insertLogoot(b1, LogootPosition.fromInts(12,0), 1, new LogootInt(1))
console.log(m.ldoc_bst.toString())
