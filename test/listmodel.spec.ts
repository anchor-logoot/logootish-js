import { expect } from 'chai'
import { DBst } from '../src/bst'
import {
  AnchorLogootNode,
  NodeType,
  DocStart,
  DocEnd,
  LeftAnchor,
  RightAnchor
} from '../src/listmodel/logoot'
import { BranchOrder } from '../src/listmodel/branch'
import {
  OperationBuffer,
  constructSkipRanges,
  fillSkipRanges,
  linkFilledSkipRanges,
  LogootPosition,
  ListDocumentModel,
  LogootInt
} from '../src/listmodel'

describe('AnchorLogootNode', () => {
  let o: BranchOrder
  const u1 = 'U1'
  const u2 = 'U2'
  const u3 = 'U3'
  beforeEach(() => {
    o = new BranchOrder()
    o.i(u1)
    o.i(u2)
    o.i(u3)
  })

  describe('property getters', () => {
    it('correctly calculated logoot end', () => {
      const node = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
        5
      )
      const end = LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [8, u1])
      expect(node.logoot_end.eq(end)).to.be.true
    })
    it('correctly aliased ldoc start', () => {
      const node = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
        5
      )
      node.value = 2
      expect(node.ldoc_start).to.be.equal(2)
    })
    it('correctly calculated ldoc end', () => {
      const node = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
        5
      )
      node.value = 2
      expect(node.ldoc_end).to.be.equal(7)
    })
    describe('ldoc_length', () => {
      it('is non-zero for data', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        node.value = 2
        expect(node.ldoc_length).to.be.equal(5)
      })
      it('is zero for everything else', () => {
        const node1 = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5,
          NodeType.REMOVAL
        )
        const node2 = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5,
          NodeType.DUMMY
        )
        expect(node1.ldoc_length).to.be.equal(0)
        expect(node2.ldoc_length).to.be.equal(0)
      })
    })
    describe('true_left', () => {
      it('Returns the left anchor when present', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        node.left_anchor = LogootPosition.fromIntsBranches(o, [1, u1], [1, u1])
        expect(node.true_left).to.be.an.instanceOf(LogootPosition)
        expect((node.true_left as LogootPosition).eq(node.left_anchor))
          .to.be.true
      })
      it('Defaults to the Logoot start', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        expect(node.true_left).to.be.an.instanceOf(LogootPosition)
        expect((node.true_left as LogootPosition).eq(node.logoot_start))
          .to.be.true
      })
    })
    describe('true_right', () => {
      it('Returns the right anchor when present', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        node.right_anchor = LogootPosition.fromIntsBranches(o, [1, u1], [5, u1])
        expect(node.true_right).to.be.an.instanceOf(LogootPosition)
        expect((node.true_right as LogootPosition).eq(node.right_anchor))
          .to.be.true
      })
      it('Defaults to the Logoot end', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        expect(node.true_right).to.be.an.instanceOf(LogootPosition)
        expect((node.true_right as LogootPosition).eq(node.logoot_end))
          .to.be.true
      })
    })
  })

  describe('reductions', () => {
    describe('reduceLeft', () => {
      it('reducing with start should have no effect', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [1, u1])
        node.left_anchor = pos
        node.reduceLeft(DocStart)
        expect(node.left_anchor.eq(pos)).to.be.true
      })
      it('will not reduce when current is closer', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [1, u1])
        node.left_anchor = pos
        node.reduceLeft(LogootPosition.fromIntsBranches(o, [1, u1], [0, u1]))
        expect(node.left_anchor.eq(pos)).to.be.true
      })
      it('will not reduce when new is after start', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [3, u1])
        node.reduceLeft(pos)
        expect(node.left_anchor).to.be.undefined
      })
      it('will reduce when new is closer', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [1, u1])
        node.left_anchor = LogootPosition.fromIntsBranches(o, [1, u1], [0, u1])
        node.reduceLeft(pos)
        expect(node.left_anchor.eq(pos)).to.be.true
      })
      it('reduction is undefined when equal to start', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1]),
          5
        )
        node.left_anchor = LogootPosition.fromIntsBranches(o, [1, u1], [1, u1])
        node.reduceLeft(LogootPosition.fromIntsBranches(o, [1, u1], [2, u1]))
        expect(node.left_anchor).to.be.undefined
      })
    })
    describe('reduceRight', () => {
      it('reducing with start should have no effect', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [10, u1])
        node.right_anchor = pos
        node.reduceRight(DocEnd)
        expect(node.right_anchor.eq(pos)).to.be.true
      })
      it('will not reduce when current is closer', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [10, u1])
        node.right_anchor = pos
        node.reduceRight(LogootPosition.fromIntsBranches(o, [1, u1], [12, u1]))
        expect(node.right_anchor.eq(pos)).to.be.true
      })
      it('will not reduce when new is before end', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [1, u1])
        node.reduceRight(pos)
        expect(node.right_anchor).to.be.undefined
      })
      it('will reduce when new is closer', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1], [3, u1]),
          5
        )
        const pos = LogootPosition.fromIntsBranches(o, [1, u1], [10, u1])
        node.right_anchor = LogootPosition.fromIntsBranches(
          o,
          [1, u1],
          [12, u1]
        )
        node.reduceRight(pos)
        expect(node.right_anchor.eq(pos)).to.be.true
      })
      it('reduction is undefined when equal to end', () => {
        const node = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [1, u1], [2, u1]),
          5
        )
        node.right_anchor = LogootPosition.fromIntsBranches(o, [1, u1], [9, u1])
        node.reduceRight(LogootPosition.fromIntsBranches(o, [1, u1], [7, u1]))
        expect(node.right_anchor).to.be.undefined
      })
    })
  })

  describe('addConflictsFromNode', () => {
    describe('left', () => {
      it('should add conflict to end', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        a.right_anchor = DocEnd
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        expect(b.addConflictsFromNode(a)).to.be.deep.equal({
          node: undefined,
          added: true
        })
        expect(b.conflict_with.has(a)).to.be.true
      })
      it('should add conflict past node', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        a.right_anchor = LogootPosition.fromIntsBranches(o, [5, u1])
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        expect(b.addConflictsFromNode(a)).to.be.deep.equal({
          node: undefined,
          added: true
        })
        expect(b.conflict_with.has(a)).to.be.true
      })
      it('should add conflict to node end', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        a.right_anchor = LogootPosition.fromIntsBranches(o, [4, u1])
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        expect(b.addConflictsFromNode(a)).to.be.deep.equal({
          node: undefined,
          added: true
        })
        expect(b.conflict_with.has(a)).to.be.true
      })
      it('should split node if necessary (and return new node)', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        a.right_anchor = LogootPosition.fromIntsBranches(o, [4, u1])
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          2
        )
        const { node, added } = b.addConflictsFromNode(a)
        expect(added).to.be.true
        expect(node).to.not.be.undefined
        expect(b.conflict_with.has(a)).to.be.true
        expect(node.conflict_with.has(a)).to.be.false
      })
    })
    describe('right', () => {
      it('should add conflict to start', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        a.left_anchor = DocStart
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        expect(b.addConflictsFromNode(a)).to.be.deep.equal({
          node: undefined,
          added: true
        })
        expect(b.conflict_with.has(a)).to.be.true
      })
      it('should add conflict past node', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        a.left_anchor = LogootPosition.fromIntsBranches(o, [-5, u1])
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        expect(b.addConflictsFromNode(a)).to.be.deep.equal({
          node: undefined,
          added: true
        })
        expect(b.conflict_with.has(a)).to.be.true
      })
      it('should add conflict to node start', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        a.left_anchor = LogootPosition.fromIntsBranches(o, [0, u1])
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          1
        )
        expect(b.addConflictsFromNode(a)).to.be.deep.equal({
          node: undefined,
          added: true
        })
        expect(b.conflict_with.has(a)).to.be.true
      })
      it('should split node if necessary (and return new node)', () => {
        const a = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [3, u1]),
          1
        )
        a.left_anchor = LogootPosition.fromIntsBranches(o, [1, u1])
        const b = new AnchorLogootNode(
          LogootPosition.fromIntsBranches(o, [0, u1]),
          2
        )
        const { node, added } = b.addConflictsFromNode(a)
        expect(added).to.be.true
        expect(node).to.not.be.undefined
        expect(b.conflict_with.has(a)).to.be.false
        expect(node.conflict_with.has(a)).to.be.true
      })
    })
  })

  describe('updateNeighborConflicts', () => {
    it('should work for basic conflict detection', () => {
      const a = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u1]),
        1
      )
      a.left_anchor = DocStart
      a.right_anchor = DocEnd
      const b = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u2]),
        1
      )
      b.left_anchor = DocStart
      b.right_anchor = DocEnd
      const c = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u3]),
        1
      )
      c.left_anchor = DocStart
      c.right_anchor = DocEnd
      b.updateNeighborConflicts(a, () => { throw Error('Should not happen') })
      c.updateNeighborConflicts(b, () => { throw Error('Should not happen') })
      expect(b.conflict_with.has(a)).to.be.true
      expect(c.conflict_with.has(b)).to.be.true
      expect(c.conflict_with.has(a)).to.be.true
    })
    it('should split node if necessary', () => {
      const a = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u1]),
        1
      )
      a.left_anchor = DocStart
      a.right_anchor = LogootPosition.fromIntsBranches(o, [1, u2])
      const b = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [0, u2]),
        2
      )
      b.left_anchor = DocStart
      b.right_anchor = DocEnd
      let newnode: AnchorLogootNode
      b.updateNeighborConflicts(a, (n) => {
        if (newnode) {
          throw Error('Should not happen')
        }
        newnode = n
      })
      expect(b.conflict_with.has(a)).to.be.true
      expect(newnode).to.not.be.undefined
      expect(newnode.conflict_with.has(a)).to.be.false
    })
  })
})

describe('LDM support functions', () => {
  const u1 = 'U1'
  const u2 = 'U2'
  const u3 = 'U3'
  let o: BranchOrder
  beforeEach(() => {
    o = new BranchOrder()
    o.i(u1)
    o.i(u2)
    o.i(u3)
  })
  const p = (...ns: number[]): LogootPosition =>
    LogootPosition.fromIntsBranches(
      o,
      ...ns.map((n) => [n, u1]) as [number, string][]
    )
  describe('constructSkipRanges', () => {
    let bst: DBst<AnchorLogootNode>
    beforeEach(() => {
      bst = new DBst<AnchorLogootNode>()
    })
    it('should default to a dummy node in skip ranges', () => {
      const left = LogootPosition.fromIntsBranches(o, [0, u1])
      const start = LogootPosition.fromIntsBranches(o, [5, u2], [0, u2])
      const end = LogootPosition.fromIntsBranches(o, [5, u2], [2, u2])
      const right = LogootPosition.fromIntsBranches(o, [9000, u3])
      const d = constructSkipRanges(bst, { left, start, end, right })

      expect(d.nc_left.length).to.be.equal(0)
      expect(d.skip_ranges.length).to.be.equal(1)
      expect(d.skip_ranges[0].type).to.be.equal(NodeType.DUMMY)
      expect(d.skip_ranges[0].ldoc_start).to.be.equal(0)
      expect(
        d.skip_ranges[0].logoot_start
          .cmp(LogootPosition.fromIntsBranches(o, [5, u2], [2, u2]))
      ).to.be.equal(0)
      expect(d.nc_right.length).to.be.equal(0)
      expect(d.anchor_left).to.be.undefined
      expect(d.anchor_right).to.be.undefined
    })
    it('should place nodes into correct category', () => {
      const left = LogootPosition.fromIntsBranches(o, [1, u1])
      const start = LogootPosition.fromIntsBranches(o, [2, u1])
      const end = LogootPosition.fromIntsBranches(o, [4, u1])
      const right = LogootPosition.fromIntsBranches(o, [6, u1])

      const nodes = ([0,1,2,3,4,5,6,7,8]).map((i) => {
        const n = new AnchorLogootNode(p(i), 1)
        n.value = i
        return n
      })
      nodes.forEach((n) => bst.add(n))
      const d = constructSkipRanges(bst, { left, start, end, right })

      expect(d.nc_left).to.have.same.members(nodes.slice(1, 2))
      expect(d.skip_ranges).to.have.same.members(nodes.slice(2, 4))
      expect(d.nc_right).to.have.same.members(nodes.slice(4, 6))
      expect(d.anchor_left).to.be.equal(nodes[0])
      expect(d.anchor_right).to.be.equal(nodes[6])
    })
    it('should discover nodes on lower levels', () => {
      const left = LogootPosition.fromIntsBranches(o, [1, u2])
      const right = LogootPosition.fromIntsBranches(o, [2, u2])
      const start = LogootPosition.fromIntsBranches(o, [1, u2], [0, u2])
      const end = LogootPosition.fromIntsBranches(o, [1, u2], [2, u2])

      const nodes = []
      let position = 0
      const addnode = (pos: LogootPosition, length: number): void => {
        const n = new AnchorLogootNode(pos, length)
        n.value = position
        position += length
        bst.add(n)
        nodes.push(n)
      }
      addnode(LogootPosition.fromIntsBranches(o, [0, u2]), 1)
      addnode(LogootPosition.fromIntsBranches(o, [1, u2], [0, u1]), 1)
      addnode(LogootPosition.fromIntsBranches(o, [1, u2], [0, u2]), 1)
      addnode(LogootPosition.fromIntsBranches(o, [1, u2], [0, u3]), 1)
      addnode(LogootPosition.fromIntsBranches(o, [2, u2]), 1)

      const d = constructSkipRanges(bst, { left, start, end, right })
      expect(d.anchor_left).to.be.equal(nodes[0])
      expect(d.anchor_right).to.be.equal(nodes[4])
      expect(d.nc_left, '`nc_left` wrong').to.same.members([nodes[1]])
      expect(d.skip_ranges.length, '`skip_ranges` wrong').to.be.equal(2)
      expect(d.skip_ranges[0], '`skip_ranges` wrong').to.be.equal(nodes[2])
      expect(d.nc_right, '`nc_right` wrong').to.same.members([nodes[3]])
    })
    describe('splitting', () => {
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
  describe('fillSkipRanges', () => {
    let opbuf: OperationBuffer
    beforeEach(() => {
      opbuf = new OperationBuffer(undefined, undefined, 5)
    })
    it('basic fill, calls bstadd', () => {
      const dummy = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [2, u1], [5, u1]),
        1,
        NodeType.DUMMY
      )
      dummy.value = 3

      const added_nodes: AnchorLogootNode[] = []
      const start = LogootPosition.fromIntsBranches(o, [-3, u1])
      const final_ranges = fillSkipRanges(
        start,
        new LogootInt(4),
        NodeType.DATA,
        [dummy],
        opbuf,
        (n: AnchorLogootNode): void => { added_nodes.push(n) }
      )

      expect(opbuf.operations).to.be.deep.equal([
        { type: 'i', start: 3, offset: 0, length: 5}
      ])
      expect(final_ranges.length).to.be.equal(1)
      expect(added_nodes.length).to.be.equal(1)
      expect(final_ranges[0]).to.be.equal(added_nodes[0])
      expect(final_ranges[0].logoot_start.eq(start)).to.be.true
      expect(final_ranges[0].type).to.be.equal(NodeType.DATA)
      expect(final_ranges[0].clk.eq(4)).to.be.true
      expect(final_ranges[0].length).to.be.equal(5)
    })
    it('basic fill on lower level', () => {
      const dummy = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [1, u1], [5, u1]),
        1,
        NodeType.DUMMY
      )
      dummy.value = 3

      const added_nodes: AnchorLogootNode[] = []
      const start = LogootPosition.fromIntsBranches(o, [1, u1], [0, u1])
      const final_ranges = fillSkipRanges(
        start,
        new LogootInt(4),
        NodeType.DATA,
        [dummy],
        opbuf,
        (n: AnchorLogootNode): void => { added_nodes.push(n) }
      )

      expect(opbuf.operations).to.be.deep.equal([
        { type: 'i', start: 3, offset: 0, length: 5}
      ])
      expect(final_ranges.length).to.be.equal(1)
      expect(added_nodes.length).to.be.equal(1)
      expect(final_ranges[0]).to.be.equal(added_nodes[0])
      expect(final_ranges[0].logoot_start.eq(start)).to.be.true
      expect(final_ranges[0].type).to.be.equal(NodeType.DATA)
      expect(final_ranges[0].clk.eq(4)).to.be.true
      expect(final_ranges[0].length).to.be.equal(5)
    })
    it('nested skipping fill', () => {
      const dummy = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [3, u1]),
        1,
        NodeType.DUMMY
      )
      dummy.value = 3
      opbuf.dummy_node = dummy
      const embedded = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [2, u1], [0, u1]),
        1,
        NodeType.DATA
      )
      embedded.value = 2

      const added_nodes: AnchorLogootNode[] = []
      const start = LogootPosition.fromIntsBranches(o, [0, u1])
      const final_ranges = fillSkipRanges(
        start,
        new LogootInt(4),
        NodeType.DATA,
        [embedded, dummy],
        opbuf,
        (n: AnchorLogootNode): void => { added_nodes.push(n) }
      )

      expect(opbuf.operations).to.be.deep.equal([
        { type: 'i', start: 2, offset: 0, length: 2},
        { type: 'i', start: 5, offset: 2, length: 1}
      ])
      expect(final_ranges.length).to.be.equal(3)
      expect(added_nodes.length).to.be.equal(2)
      expect(final_ranges[0]).to.be.equal(added_nodes[0])
      expect(final_ranges[1]).to.be.equal(embedded)
      expect(final_ranges[2]).to.be.equal(added_nodes[1])

      expect(added_nodes[0].logoot_start.eq(start)).to.be.true
      expect(added_nodes[1].logoot_start.eq(start.offsetLowest(2))).to.be.true
    })
    it('overwrite fill', () => {
      const dummy = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [3, u1]),
        1,
        NodeType.DUMMY
      )
      dummy.value = 3
      opbuf.dummy_node = dummy
      const embedded = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [1, u1]),
        1,
        NodeType.DATA
      )
      embedded.value = 2

      const added_nodes: AnchorLogootNode[] = []
      const start = LogootPosition.fromIntsBranches(o, [0, u1])
      const final_ranges = fillSkipRanges(
        start,
        new LogootInt(4),
        NodeType.DATA,
        [embedded, dummy],
        opbuf,
        (n: AnchorLogootNode): void => {
          embedded.addChild(n, () => { throw new Error('Should not happen') })
          added_nodes.push(n)
        }
      )

      expect(opbuf.operations).to.be.deep.equal([
        { type: 'i', start: 2, offset: 0, length: 1},
        { type: 'r', start: 3, length: 1},
        { type: 'i', start: 3, offset: 1, length: 1},
        { type: 'i', start: 4, offset: 2, length: 1}
      ])
      expect(final_ranges.length).to.be.equal(3)
      expect(added_nodes.length).to.be.equal(2)
      expect(final_ranges[0]).to.be.equal(added_nodes[0])
      expect(final_ranges[1]).to.be.equal(embedded)
      expect(final_ranges[2]).to.be.equal(added_nodes[1])

      expect(added_nodes[0].logoot_start.eq(start)).to.be.true
      expect(added_nodes[1].logoot_start.eq(start.offsetLowest(2))).to.be.true
    })
    it('new node has priority', () => {
      const dummy = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [3, u1]),
        1,
        NodeType.DUMMY
      )
      dummy.value = 3
      opbuf.dummy_node = dummy
      const embedded = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [1, u1]),
        1,
        NodeType.DATA
      )
      embedded.value = 2

      const added_nodes: AnchorLogootNode[] = []
      const start = LogootPosition.fromIntsBranches(o, [0, u1])
      fillSkipRanges(
        start,
        new LogootInt(0),
        NodeType.DATA,
        [embedded, dummy],
        opbuf,
        (n: AnchorLogootNode): void => {
          embedded.addChild(n, () => { throw new Error('Should not happen') })
          added_nodes.push(n)
        }
      )

      expect(opbuf.operations).to.be.deep.equal([
        { type: 'i', start: 2, offset: 0, length: 1},
        { type: 'r', start: 3, length: 1},
        { type: 'i', start: 3, offset: 1, length: 1},
        { type: 'i', start: 4, offset: 2, length: 1}
      ])
    })
  })
  describe('linkFilledSkipRanges', () => {
    let nodes: AnchorLogootNode[]
    beforeEach(() => {
      nodes = [2,3,4]
        .map((n) => LogootPosition.fromIntsBranches(o, [n, u1]))
        .map((pos) => {
          const node = new AnchorLogootNode(pos, 1, NodeType.DATA)
          node.left_anchor = DocStart
          node.right_anchor = DocEnd
          return node
        })
    })
    it('basic linkage', () => {
      const p = (n: number): LogootPosition =>
        LogootPosition.fromIntsBranches(o, [n, u1])

      linkFilledSkipRanges(p(0), p(6), nodes)
      
      const expectAnchorEqual = (
        pos: LeftAnchor | RightAnchor,
        to: LogootPosition
      ): void => {
        expect(pos).to.be.an.instanceOf(LogootPosition)
        expect((pos as LogootPosition).eq(to)).to.be.true
      }

      expectAnchorEqual(nodes[0].true_left, p(0))
      expectAnchorEqual(nodes[0].true_right, p(3))
      expectAnchorEqual(nodes[1].true_left, p(3))
      expectAnchorEqual(nodes[1].true_right, p(4))
      expectAnchorEqual(nodes[2].true_left, p(4))
      expectAnchorEqual(nodes[2].true_right, p(6))
    })
    it('should not link nodes on lower level', () => {
      const p = (n: number): LogootPosition =>
        LogootPosition.fromIntsBranches(o, [n, u1])

      const lower_node = new AnchorLogootNode(
        LogootPosition.fromIntsBranches(o, [3, u1], [0, u1]),
        1,
        NodeType.DATA
      )
      lower_node.left_anchor = DocStart
      lower_node.right_anchor = DocEnd
      nodes.splice(1, 0, lower_node)

      linkFilledSkipRanges(p(0), p(6), nodes)
      
      const expectAnchorEqual = (
        pos: LeftAnchor | RightAnchor,
        to: LogootPosition
      ): void => {
        expect(pos).to.be.an.instanceOf(LogootPosition)
        expect((pos as LogootPosition).eq(to)).to.be.true
      }

      expectAnchorEqual(nodes[0].true_left, p(0))
      expectAnchorEqual(nodes[0].true_right, p(3))
      expect(nodes[1].true_left).to.be.equal(DocStart)
      expect(nodes[1].true_right).to.be.equal(DocEnd)
      expectAnchorEqual(nodes[2].true_left, p(3))
      expectAnchorEqual(nodes[2].true_right, p(4))
      expectAnchorEqual(nodes[3].true_left, p(4))
      expectAnchorEqual(nodes[3].true_right, p(6))
    })
  })
  describe('fillRangeConflicts', () => {
    // TODO
  })
})

describe('ListDocumentModel', () => {
  let o: BranchOrder
  let ldm: ListDocumentModel
  const u1 = 'U1'
  const u2 = 'U2'
  const u3 = 'U3'
  const p = (...ns: number[]): LogootPosition =>
    LogootPosition.fromIntsBranches(
      o,
      ...ns.map((n) => [n, u1]) as [number, string][]
    )
  beforeEach(() => {
    o = new BranchOrder()
    ldm = new ListDocumentModel(o)
    ldm.opts.agressively_test_bst = true
    o.i(u1)
    o.i(u2)
    o.i(u3)
  })
  describe('insertLocal', () => {
    it('should default to an `undefined` anchor', () => {
      const { left, right, clk, length } = ldm.insertLocal(0, 5)
      expect(left).to.be.undefined
      expect(right).to.be.undefined
      expect(clk.eq(0)).to.be.true
      expect(length).to.be.equal(5)
    })
    it('should make neighbors anchor nodes', () => {
      ldm.bst.add(new AnchorLogootNode(p(0), 2))
      ldm.bst.add(((): AnchorLogootNode => {
        const node = new AnchorLogootNode(p(20), 2)
        node.value = 2
        return node
      })())
      const { left, right, clk, length } = ldm.insertLocal(2, 5)
      expect(left.eq(p(2))).to.be.true
      expect(right.eq(p(20))).to.be.true
      expect(clk.eq(0)).to.be.true
      expect(length).to.be.equal(5)
    })
    it('should return correct position in middle of node', () => {
      ldm.bst.add(new AnchorLogootNode(p(0), 2))
      const { left, right, clk, length } = ldm.insertLocal(1, 5)
      expect(left.eq(p(1))).to.be.true
      expect(right.eq(p(1))).to.be.true
      expect(clk.eq(0)).to.be.true
      expect(length).to.be.equal(5)
    })
  })
  describe('insertLogoot', () => {
    afterEach('self-test', () => {
      ldm.selfTest()
    })
    describe('additions', () => {
      it('insertion to blank BST', () => {
        const ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          2,
          new LogootInt(5)
        )
        const exp_s = LogootPosition.fromIntsBranches(o, [0, u1])
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 2 }
        ])
        const nodes = ldm.all_nodes
        expect(nodes.length).to.be.equal(1)
        expect(nodes[0].logoot_start.cmp(exp_s)).to.be.equal(0)
        expect(nodes[0].length).to.be.equal(2)
        expect(nodes[0].clk.js_int).to.be.equal(5)
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
      })
      it('insertion to blank BST with right/left positions', () => {
        const ops = ldm.insertLogoot(
          u1,
          LogootPosition.fromIntsBranches(o, [1, u2]),
          LogootPosition.fromIntsBranches(o, [1, u2]),
          2,
          new LogootInt(5)
        )
        const nodes = ldm.all_nodes
        const exp_s = LogootPosition.fromIntsBranches(o, [1, u2], [0, u1])
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 2 }
        ])
        expect(nodes.length).to.be.equal(1)
        expect(nodes[0].logoot_start.cmp(exp_s)).to.be.equal(0)
        expect(nodes[0].length).to.be.equal(2)
        expect(nodes[0].clk.js_int).to.be.equal(5)
      })
      it('consecutive insertions', () => {
        let ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          2,
          new LogootInt(5)
        )
        let nodes = ldm.all_nodes
        let exp_s = LogootPosition.fromIntsBranches(o, [0, u1])
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 2 }
        ])
        expect(nodes.length).to.be.equal(1)
        expect(nodes[0].logoot_start.cmp(exp_s)).to.be.equal(0)
        expect(nodes[0].length).to.be.equal(2)
        expect(nodes[0].clk.js_int).to.be.equal(5)
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        ops = ldm.insertLogoot(
          u1,
          LogootPosition.fromIntsBranches(o, [2, u1]),
          undefined,
          1,
          new LogootInt(2)
        )
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 2, offset: 0, length: 1 }
        ])
      })
      it('consecutive backwards insertions with offset', () => {
        let ops = ldm.insertLogoot(
          u2,
          undefined,
          undefined,
          2,
          new LogootInt(5)
        )
        let nodes = ldm.all_nodes
        let exp_s = LogootPosition.fromIntsBranches(o, [0, u2])
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 2 }
        ])
        expect(nodes.length).to.be.equal(1)
        expect(nodes[0].logoot_start.cmp(exp_s)).to.be.equal(0)
        expect(nodes[0].length).to.be.equal(2)
        expect(nodes[0].clk.js_int).to.be.equal(5)
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        ops = ldm.insertLogoot(
          u1,
          undefined,
          LogootPosition.fromIntsBranches(o, [0, u2]),
          1,
          new LogootInt(2)
        )
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 }
        ])
      })
      it('insertion overwriting', () => {
        let ops = ldm.insertLogoot(
          u1,
          LogootPosition.fromIntsBranches(o, [1, u1]),
          undefined,
          1,
          new LogootInt(2)
        )
        let nodes = ldm.all_nodes
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 }
        ])
        ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          3,
          new LogootInt(5)
        )
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 },
          { type: 'r', start: 1, length: 1 },
          { type: 'i', start: 1, offset: 1, length: 1 },
          { type: 'i', start: 2, offset: 2, length: 1 }
        ])
      })
      it('insertion skipping', () => {
        let ops = ldm.insertLogoot(
          u1,
          LogootPosition.fromIntsBranches(o, [1, u1]),
          undefined,
          1,
          new LogootInt(5)
        )
        let nodes = ldm.all_nodes
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 }
        ])
        ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          3,
          new LogootInt(2)
        )
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 },
          { type: 'i', start: 2, offset: 2, length: 1 }
        ])
      })
      it('nested insertion skipping', () => {
        let ops = ldm.insertLogoot(
          u1,
          LogootPosition.fromIntsBranches(o, [1, u1]),
          LogootPosition.fromIntsBranches(o, [1, u1]),
          1,
          new LogootInt(5)
        )
        let nodes = ldm.all_nodes
        expect(nodes[0].logoot_start.eq(
          LogootPosition.fromIntsBranches(o, [1, u1], [0, u1])
        )).to.be.true
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 }
        ])
        ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          2,
          new LogootInt(2)
        )
        expect(ops).to.be.deep.equal([
          { type: 'i', start: 0, offset: 0, length: 1 },
          { type: 'i', start: 2, offset: 1, length: 1 }
        ])
      })
    })
    describe('conflicts', () => {
      it('new node reduces old anchor (end reduction)', () => {
        let ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          2,
          new LogootInt(5)
        )
        let nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        ops = ldm.insertLogoot(
          u1,
          LogootPosition.fromIntsBranches(o, [2, u1]),
          undefined,
          1,
          new LogootInt(2)
        )
        nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.an.instanceOf(LogootPosition)
        expect(
          (nodes[0].true_right as LogootPosition)
            .eq(LogootPosition.fromIntsBranches(o, [2, u1])),
          'First right wrong'
        ).to.be.true
        expect(nodes[1].true_left).to.be.an.instanceOf(LogootPosition)
        expect(
          (nodes[1].true_left as LogootPosition)
            .eq(LogootPosition.fromIntsBranches(o, [2, u1])),
          'Second left wrong'
        ).to.be.true
        expect(nodes[1].true_right).to.be.equal(DocEnd)
      })
      it('new node reduces old anchor (start reduction)', () => {
        let ops = ldm.insertLogoot(
          u2, // Unlike above, we have to impersonate a user to test this
          undefined,
          undefined,
          1,
          new LogootInt(2)
        )
        let nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        ops = ldm.insertLogoot(
          u1,
          undefined,
          LogootPosition.fromIntsBranches(o, [0, u2]),
          2,
          new LogootInt(5)
        )
        nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.an.instanceOf(LogootPosition)
        expect(
          (nodes[0].true_right as LogootPosition)
            .eq(LogootPosition.fromIntsBranches(o, [0, u2])),
          'First right wrong'
        ).to.be.true
        expect(nodes[1].true_left).to.be.an.instanceOf(LogootPosition)
        expect(
          (nodes[1].true_left as LogootPosition)
            .eq(LogootPosition.fromIntsBranches(o, [2, u1])),
          'Second left wrong'
        ).to.be.true
        expect(nodes[1].true_right).to.be.equal(DocEnd)
      })
      it('conflict creation', () => {
        let ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          1,
          new LogootInt(2)
        )
        let nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        ops = ldm.insertLogoot(
          u2,
          undefined,
          undefined,
          2,
          new LogootInt(5)
        )
        nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        expect(nodes[1].true_left).to.be.equal(DocStart)
        expect(nodes[1].true_right).to.be.equal(DocEnd)

        expect(nodes[1].conflict_with).to.include(nodes[0])
        expect(nodes[0].conflict_with).to.include(nodes[1])
      })
      it('conflict creation, reverse order', () => {
        let ops = ldm.insertLogoot(
          u2,
          undefined,
          undefined,
          1,
          new LogootInt(2)
        )
        let nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        ops = ldm.insertLogoot(
          u1,
          undefined,
          undefined,
          2,
          new LogootInt(5)
        )
        nodes = ldm.all_nodes
        expect(nodes[0].true_left).to.be.equal(DocStart)
        expect(nodes[0].true_right).to.be.equal(DocEnd)
        expect(nodes[1].true_left).to.be.equal(DocStart)
        expect(nodes[1].true_right).to.be.equal(DocEnd)

        expect(nodes[1].conflict_with).to.include(nodes[0])
        expect(nodes[0].conflict_with).to.include(nodes[1])
      })
    })
  })
})