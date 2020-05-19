import { expect } from 'chai'
import { DBst } from '../src/bst'
import { AnchorLogootNode, NodeType } from '../src/listmodel/logoot'
import { BranchOrder } from '../src/listmodel/branch'
import { constructSkipRanges, LogootPosition } from '../src/listmodel'

describe('LDM support functions', () => {
  describe('constructSkipRanges', () => {
    let bst: DBst<AnchorLogootNode>
    const u1 = 'U1'
    const u2 = 'U2'
    const u3 = 'U3'
    let o: BranchOrder
    beforeEach(() => {
      bst = new DBst<AnchorLogootNode>()
      o = new BranchOrder()
      o.i(u1)
      o.i(u2)
      o.i(u3)
    })
    it('should default to a dummy node in skip ranges', () => {
      const left = LogootPosition.fromIntsBranches(o, [0, u1])
      const start = LogootPosition.fromIntsBranches(o, [5, u2], [0, u2])
      const end = LogootPosition.fromIntsBranches(o, [5, u2], [2, u2])
      const right = LogootPosition.fromIntsBranches(o, [9000, u3])
      const { nc_left, skip_ranges, nc_right } = constructSkipRanges(
        bst,
        { left, start, end, right }
      )

      expect(nc_left.length).to.be.equal(0)
      expect(skip_ranges.length).to.be.equal(1)
      expect(skip_ranges[0].type).to.be.equal(NodeType.DUMMY)
      expect(skip_ranges[0].ldoc_start).to.be.equal(0)
      expect(
        skip_ranges[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [5, u2], [2, u2]))
      ).to.be.equal(0)
      expect(nc_right.length).to.be.equal(0)
    })
    it('should place nodes into correct category', () => {
      const left = LogootPosition.fromIntsBranches(o, [1, u1])
      const start = LogootPosition.fromIntsBranches(o, [2, u1])
      const end = LogootPosition.fromIntsBranches(o, [4, u1])
      const right = LogootPosition.fromIntsBranches(o, [6, u1])

      const nodes = ([0,1,2,3,4,5,6,7,8]).map((i) => {
        const n = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [i, u1]),
          1
        )
        n.value = i
        return n
      })
      nodes.forEach((n) => bst.add(n))
      const { nc_left, skip_ranges, nc_right } = constructSkipRanges(
        bst,
        { left, start, end, right }
      )

      expect(nc_left).to.have.same.members(nodes.slice(1, 2))
      expect(skip_ranges).to.have.same.members(nodes.slice(2, 4))
      expect(nc_right).to.have.same.members(nodes.slice(4, 7))
    })
    it('should split into skip_ranges', () => {
      const left = LogootPosition.fromIntsBranches(o, [0, u1])
      const start = LogootPosition.fromIntsBranches(o, [2, u1])
      const end = LogootPosition.fromIntsBranches(o, [4, u1])
      const right = LogootPosition.fromIntsBranches(o, [6, u1])

      const n = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u1]),
        3
      )
      bst.add(n)
      const { nc_left, skip_ranges, nc_right } = constructSkipRanges(
        bst,
        { left, start, end, right }
      )

      expect(nc_left).to.have.same.members([n])

      expect(skip_ranges.length).to.be.equal(2)
      expect(
        skip_ranges[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [2, u1]))
      ).to.be.equal(0)
      expect(skip_ranges[0].ldoc_start).to.be.equal(2)
      expect(skip_ranges[0].length).to.be.equal(1)

      expect(
        skip_ranges[1].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [4, u1]))
      ).to.be.equal(0)
      expect(skip_ranges[1].ldoc_start).to.be.equal(3)
      expect(skip_ranges[1].type).to.be.equal(NodeType.DUMMY)

      expect(nc_right.length).to.be.equal(0)
    })
    it('should split into nc_right', () => {
      const left = LogootPosition.fromIntsBranches(o, [0, u1])
      const start = LogootPosition.fromIntsBranches(o, [2, u1])
      const end = LogootPosition.fromIntsBranches(o, [4, u1])
      const right = LogootPosition.fromIntsBranches(o, [6, u1])

      const n = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u1]),
        2
      )
      bst.add(n)
      const n2 = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [3, u1]),
        2
      )
      n2.value = 2
      bst.add(n2)
      const { nc_left, skip_ranges, nc_right } = constructSkipRanges(
        bst,
        { left, start, end, right }
      )

      expect(nc_left).to.have.same.members([n])

      expect(skip_ranges.length).to.be.equal(1)
      expect(
        skip_ranges[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [3, u1]))
      ).to.be.equal(0)
      expect(skip_ranges[0].ldoc_start).to.be.equal(2)
      expect(skip_ranges[0].length).to.be.equal(1)

      expect(nc_right.length).to.be.equal(1)
      expect(
        nc_right[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [4, u1]))
      ).to.be.equal(0)
      expect(nc_right[0].ldoc_start).to.be.equal(3)
      expect(nc_right[0].length).to.be.equal(1)
    })
    it('should split into skip_ranges and nc_right', () => {
      const left = LogootPosition.fromIntsBranches(o, [0, u1])
      const start = LogootPosition.fromIntsBranches(o, [2, u1])
      const end = LogootPosition.fromIntsBranches(o, [4, u1])
      const right = LogootPosition.fromIntsBranches(o, [6, u1])

      const n = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u1]),
        5
      )
      bst.add(n)
      const { nc_left, skip_ranges, nc_right } = constructSkipRanges(
        bst,
        { left, start, end, right }
      )

      expect(nc_left).to.have.same.members([n])

      expect(skip_ranges.length).to.be.equal(1)
      expect(
        skip_ranges[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [2, u1]))
      ).to.be.equal(0)
      expect(skip_ranges[0].ldoc_start).to.be.equal(2)
      expect(skip_ranges[0].length).to.be.equal(2)

      expect(nc_right.length).to.be.equal(1)
      expect(
        nc_right[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [4, u1]))
      ).to.be.equal(0)
      expect(nc_right[0].ldoc_start).to.be.equal(4)
      expect(nc_right[0].length).to.be.equal(1)
    })
    it('should infer position from dummy node', () => {
      const left = LogootPosition.fromIntsBranches(o, [4, u2])
      const start = LogootPosition.fromIntsBranches(o, [5, u2])
      const end = LogootPosition.fromIntsBranches(o, [6, u2])
      const right = LogootPosition.fromIntsBranches(o, [9000, u3])

      bst.add(new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u1]),
        1
      ))
      const { nc_left, skip_ranges, nc_right } = constructSkipRanges(
        bst,
        { left, start, end, right }
      )

      expect(nc_left.length).to.be.equal(0)
      expect(skip_ranges.length).to.be.equal(1)
      expect(skip_ranges[0].type).to.be.equal(NodeType.DUMMY)
      expect(skip_ranges[0].ldoc_start).to.be.equal(1, 'Did not infer pos')
      expect(
        skip_ranges[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [6, u2]))
      ).to.be.equal(0)
      expect(nc_right.length).to.be.equal(0)
    })
  })
})