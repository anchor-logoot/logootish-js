import { expect } from 'chai'
import { DBst, DBstNode } from '../src/bst'
import { CompareResult } from '../src/utils'
import { cmpResult } from '../src/compare'

class DummyNode extends DBstNode<DummyNode> {
  constructor(public value: number, public p: number = value) {
    super()
  }
  get n() {
    return this.absolute_value
  }
  get lv() {
    return this.value
  }
  preferential_cmp(other: DummyNode): CompareResult {
    return cmpResult(this.p - other.p)
  }
  toString() {
    return `DummyNode ${this.n} (${this.lv}) ${this.p}`
  }
}

describe('DBst (Differential Binary Search Tree)', () => {
  let b: DBst<DummyNode>
  beforeEach(() => {
    b = new DBst<DummyNode>()
  })
  afterEach(() => {
    b.selfTest()
  })

  const constructFullTree = () => {
    const n5 = new DummyNode(5)
    const n3 = new DummyNode(3)
    const n4 = new DummyNode(4)
    const n2 = new DummyNode(2)
    const n7 = new DummyNode(7)
    const n6 = new DummyNode(6)
    const n8 = new DummyNode(8)
    b.add(n5)

    b.add(n3)
    b.add(n4)
    b.add(n2)

    b.add(n7)
    b.add(n6)
    b.add(n8)
    return { n2, n3, n4, n5, n6, n7, n8 }
  }
  describe('additions', () => {
    it('should add to BST root', () => {
      const n1 = new DummyNode(5, 4)
      b.add(n1)
      expect(b.bst_root).to.be.equal(n1)
      expect(b.bst_root.value).to.be.equal(5)
    })
    it('gt/lt should add to correct side of root', () => {
      const n1 = new DummyNode(5)
      const n2 = new DummyNode(2, 9000)
      const n3 = new DummyNode(6, -9000)
      b.add(n1)
      b.add(n2)
      b.add(n3)
      expect(b.bst_root).to.be.equal(n1)
      expect(n1.value).to.be.equal(5)
      expect(b.bst_root.left_node).to.be.equal(n2)
      expect(n2.value).to.be.equal(-3)
      expect(b.bst_root.right_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(1)
    })
    it('should create/reorder equal_nodes containing equal values', () => {
      const n1 = new DummyNode(5, 3)
      const n2 = new DummyNode(5, 0)
      const n3 = new DummyNode(5, 6)
      const n4 = new DummyNode(5, 7)
      b.add(n1)
      b.add(n2)
      b.add(n3)
      b.add(n4)

      expect(b.bst_root).to.be.equal(n2)
      expect(n2.value).to.be.equal(5)
      expect(b.bst_root.equal_nodes[0]).to.be.equal(n1)
      expect(n1.value).to.be.equal(0)
      expect(b.bst_root.equal_nodes[1]).to.be.equal(n3)
      expect(n3.value).to.be.equal(0)
      expect(b.bst_root.equal_nodes[2]).to.be.equal(n4)
      expect(n4.value).to.be.equal(0)
    })
    it('should insert equal node to equal_nodes', () => {
      const n1 = new DummyNode(5, 6)
      const n2 = new DummyNode(2)
      const n3 = new DummyNode(5, 3)
      b.add(n1)
      b.add(n2)
      b.add(n3)

      expect(b.bst_root).to.be.equal(n3)
      expect(n3.value).to.be.equal(5)
      expect(n3.left_node).to.be.equal(n2)
      expect(n2.value).to.be.equal(-3)
      expect(n3.equal_nodes[0]).to.be.equal(n1)
      expect(n1.value).to.be.equal(0)
    })
    it('should form a complete tree', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      expect(b.bst_root).to.be.equal(n5)
      expect(n5.value).to.be.equal(5)

      expect(b.bst_root.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(-2)
      expect(b.bst_root.left_node.left_node).to.be.equal(n2)
      expect(n2.value).to.be.equal(-1)
      expect(b.bst_root.left_node.right_node).to.be.equal(n4)
      expect(n4.value).to.be.equal(1)

      expect(b.bst_root.right_node).to.be.equal(n7)
      expect(n7.value).to.be.equal(2)
      expect(b.bst_root.right_node.left_node).to.be.equal(n6)
      expect(n6.value).to.be.equal(-1)
      expect(b.bst_root.right_node.right_node).to.be.equal(n8)
      expect(n8.value).to.be.equal(1)
    })
    it('should replace the node if preferential_cmp says it is less', () => {
      const n5 = new DummyNode(5)
      const n3 = new DummyNode(3)
      const n35 = new DummyNode(3, 3.5)

      b.add(n5)
      b.add(n35)
      b.add(n3)

      expect(n5.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(-2)
      expect(n3.equal_nodes[0]).to.be.equal(n35)
      expect(n35.value).to.be.equal(0)
    })
    it('should update root if necessary', () => {
      const n3 = new DummyNode(3)
      const n35 = new DummyNode(3, 3.5)

      b.add(n35)
      b.add(n3)

      expect(b.bst_root).to.be.equal(n3)
      expect(n3.value).to.be.equal(3)
      expect(n3.equal_nodes[0]).to.be.equal(n35)
      expect(n35.value).to.be.equal(0)
    })
    it('replacement should preserve children', () => {
      const n5 = new DummyNode(5)
      const n3 = new DummyNode(3)
      const n2 = new DummyNode(2)
      const n4 = new DummyNode(4)
      const n35 = new DummyNode(3, 3.5)

      b.add(n5)
      b.add(n35)
      b.add(n2)
      b.add(n4)
      b.add(n3)

      expect(n5.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(-2)
      expect(n3.equal_nodes[0]).to.be.equal(n35)
      expect(n35.value).to.be.equal(0)

      expect(n3.right_node).to.be.equal(n4)
      expect(n3.left_node).to.be.equal(n2)
    })
    describe('duplicates', () => {
      it('should throw error when duplicate root', () => {
        const na = new DummyNode(5, 5)
        const nb = new DummyNode(5, 5)
        b.add(na)
        expect(() => b.add(nb)).to.throw('Duplicate node added')
      })
      it('should throw error when duplicate child', () => {
        const n0 = new DummyNode(0, 0)
        const na = new DummyNode(5, 5)
        const nb = new DummyNode(5, 5)
        b.add(n0)
        b.add(na)
        expect(() => b.add(nb)).to.throw('Duplicate node added')
      })
      it('should throw error when duplicate equal', () => {
        const na = new DummyNode(5, 3)
        const nb = new DummyNode(5, 5)
        const nc = new DummyNode(5, 5)
        b.add(na)
        b.add(nb)
        expect(() => b.add(nc)).to.throw('Duplicate node added')
      })
    })
  })

  describe('absolute_value', () => {
    it('should work on the default full tree', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      expect(n2.absolute_value).to.be.equal(2)
      expect(n3.absolute_value).to.be.equal(3)
      expect(n4.absolute_value).to.be.equal(4)
      expect(n5.absolute_value).to.be.equal(5)
      expect(n6.absolute_value).to.be.equal(6)
      expect(n7.absolute_value).to.be.equal(7)
      expect(n8.absolute_value).to.be.equal(8)
    })
  })

  describe('traversal getters', () => {
    describe('smallest_child', () => {
      it('should return smallest child from deep tree', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n5.smallest_child).to.be.equal(n2)
      })
      it('should fall back to a greater child if no smaller', () => {
        const n5 = new DummyNode(5)
        const n7 = new DummyNode(7)
        const n6 = new DummyNode(6)
        const n8 = new DummyNode(8)
        b.add(n5)

        b.add(n7)
        b.add(n6)
        b.add(n8)
        expect(n5.smallest_child).to.be.equal(n6)
      })
    })
    describe('smallest_smaller_child', () => {
      it('should return smallest child from deep tree', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n5.smallest_smaller_child).to.be.equal(n2)
      })
      it('should NOT fall back to a greater child if no smaller', () => {
        const n5 = new DummyNode(5)
        const n7 = new DummyNode(7)
        const n6 = new DummyNode(6)
        const n8 = new DummyNode(8)
        b.add(n5)

        b.add(n7)
        b.add(n6)
        b.add(n8)
        expect(n5.smallest_smaller_child).to.be.equal(undefined)
      })
    })
    describe('largest_child', () => {
      it('should return largest child from deep tree', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n5.largest_child).to.be.equal(n8)
      })
      it('should fall back to a lesser child if no greater', () => {
        const n5 = new DummyNode(5)
        const n3 = new DummyNode(3)
        const n2 = new DummyNode(2)
        const n4 = new DummyNode(4)
        b.add(n5)

        b.add(n3)
        b.add(n2)
        b.add(n4)
        expect(n5.largest_child).to.be.equal(n4)
      })
    })
    describe('largest_larger_child', () => {
      it('should return smallest child from deep tree', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n5.largest_larger_child).to.be.equal(n8)
      })
      it('should NOT fall back to a greater child if no smaller', () => {
        const n5 = new DummyNode(5)
        const n3 = new DummyNode(3)
        const n2 = new DummyNode(2)
        const n4 = new DummyNode(4)
        b.add(n5)

        b.add(n3)
        b.add(n2)
        b.add(n4)
        expect(n5.largest_larger_child).to.be.equal(undefined)
      })
    })

    describe('equal_parent', () => {
      it('should get the top parent of a equal linked list', () => {
        const n5 = new DummyNode(5)
        const n3 = new DummyNode(3)
        const n2 = new DummyNode(2)
        const n4 = new DummyNode(4)

        const d1 = new DummyNode(2, 1)
        const d2 = new DummyNode(2, 0)
        const d3 = new DummyNode(2, -1)
        b.add(n5)

        b.add(n3)
        b.add(n2)
        b.add(n4)

        b.add(d1)
        b.add(d2)
        b.add(d3)

        expect(n2.equal_parent).to.be.equal(d3)
      })
    })
    describe('root', () => {
      it('should find tree root', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n6.root).to.be.equal(n5)
      })
    })

    describe('inorder_successor', () => {
      it('should return parent if parent is successor', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n2.inorder_successor).to.be.equal(n3)
      })
      it('should return smallest child if child is successor', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n5.inorder_successor).to.be.equal(n6)
      })
      it('should return undefined if successor does not exist', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n8.inorder_successor).to.be.equal(undefined)
      })
      it('should return next element of equal nodes', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(1, 4)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n3.inorder_successor).to.be.equal(n4)
      })
      it('should return first equal node when called on parent', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(1, 4)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n1.inorder_successor).to.be.equal(n2)
      })
      it('should return first equal node even with right child', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(2)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n1.inorder_successor).to.be.equal(n2)
      })
      it('should jump up from equal node and return right child', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(2)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n3.inorder_successor).to.be.equal(n4)
      })
    })
    describe('inorder_predecessor', () => {
      it('should return parent if parent is predecessor', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n8.inorder_predecessor).to.be.equal(n7)
      })
      it('should return largest child if child is predecessor', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n5.inorder_predecessor).to.be.equal(n4)
      })
      it('should return undefined if predecessor does not exist', () => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        expect(n2.inorder_predecessor).to.be.equal(undefined)
      })
      it('should return last element of equal nodes', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(1, 4)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n3.inorder_predecessor).to.be.equal(n2)
      })
      it('should return parent when at last equal node', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(1, 4)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n2.inorder_predecessor).to.be.equal(n1)
      })
      it('should return last equal node when traversing up', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(2)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        b.add(n4)
        expect(n4.inorder_predecessor).to.be.equal(n3)
      })
      it('should return last equal node when traversing down', () => {
        const n1 = new DummyNode(1, 1)
        const n2 = new DummyNode(1, 2)
        const n3 = new DummyNode(1, 3)
        const n4 = new DummyNode(2)
        b.add(n4)
        b.add(n1)
        b.add(n2)
        b.add(n3)
        expect(n4.inorder_predecessor).to.be.equal(n3)
      })
    })
  })

  describe('node replacement', () => {
    it('basic replacement', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      const n1 = new DummyNode(1)
      n2.replaceWith(n1)
      expect(n3.left_node).to.be.equal(n1, 'Node is not in correct position')
      expect(n1.parent_node).to.be.equal(n3, 'Parent is not correct')
      expect(n1.absolute_value).to.be.equal(1, 'Value is not correct')
    })
    it('basic replacement, opposite side of parent', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      const n9 = new DummyNode(9)
      n8.replaceWith(n9)
      expect(n7.right_node).to.be.equal(n9, 'Node is not in correct position')
      expect(n9.parent_node).to.be.equal(n7, 'Parent is not correct')
      expect(n9.absolute_value).to.be.equal(9, 'Value is not correct')
    })
    it('should transplant children', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      const n25 = new DummyNode(2.5)
      n3.replaceWith(n25)
      expect(n5.left_node).to.be.equal(n25, 'Node is not in correct position')
      expect(n25.parent_node).to.be.equal(n5, 'Parent is not correct')
      expect(n25.absolute_value).to.be.equal(2.5, 'Value is not correct')
      expect(n25.left_node).to.be.equal(n2, 'Left child is not correct')
      expect(n25.right_node).to.be.equal(n4, 'Right child is not correct')
      expect(n2.absolute_value).to.be.equal(2, 'Left child value is wrong')
      expect(n4.absolute_value).to.be.equal(4, 'Right child value is wrong')
    })
    it('should reorder equal nodes', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      // This was the result of a test bug: Order must be maintained
      n4.p = 4.5

      const n4n = new DummyNode(4, 4)
      n3.replaceWith(n4n)

      expect(n5.left_node).to.be.equal(n4n, 'Node is not in correct position')
      expect(n4n.parent_node).to.be.equal(n5, 'Parent is not correct')
      expect(n4n.left_node).to.be.equal(n2, 'Left node is not correct')
      expect(n2.absolute_value).to.be.equal(2, 'Left node value was changed')
      expect(n4n.right_node, 'Right node is not correct').to.be.undefined
      expect(n4n.equal_nodes[0]).to.be.equal(n4, 'Equal node was not nested')
      expect(n4.absolute_value).to.be.equal(4, 'Equal node value is wrong')
    })
    it('should reorder equal nodes (double-replacing if necessary)', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()

      const n2n = new DummyNode(2, 2.5)
      n3.replaceWith(n2n)

      expect(n5.left_node).to.be.equal(n2, 'Node is not in correct position')
      expect(n2.parent_node).to.be.equal(n5, 'Parent is not correct')
      expect(n2.left_node, 'Left node is not correct').to.be.undefined
      expect(n2.right_node).to.be.equal(n4, 'Right node is not correct')
      expect(n4.absolute_value).to.be.equal(4, 'Right node value was changed')
      expect(n2.equal_nodes[0]).to.be.equal(n2n, 'Equal node was not nested')
      expect(n2n.absolute_value).to.be.equal(2, 'Equal node value is wrong')
    })
    it('should remove node from previous location', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      n5.replaceWith(n4, (p) => b.bst_root = p)
      expect(b.bst_root).to.be.equal(n4)
      expect(n4.value).to.be.equal(4)

      expect(b.bst_root.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(-1)
      expect(b.bst_root.left_node.left_node).to.be.equal(n2)
      expect(n2.value).to.be.equal(-1)
      expect(b.bst_root.left_node.right_node).to.be.equal(undefined)

      expect(b.bst_root.right_node).to.be.equal(n7)
      expect(n7.value).to.be.equal(3)
      expect(b.bst_root.right_node.left_node).to.be.equal(n6)
      expect(n6.value).to.be.equal(-1)
      expect(b.bst_root.right_node.right_node).to.be.equal(n8)
      expect(n8.value).to.be.equal(1)
    })
  })

  describe('addSpaceBefore', () => {
    it('should properly rearrange', () => {
      const n1 = new DummyNode(1)
      const n2 = new DummyNode(2)
      const n3 = new DummyNode(3)
      const n4 = new DummyNode(4)
      b.add(n1)
      b.add(n2)
      b.add(n3)
      b.add(n4)
      n2.addSpaceBefore(-1, (np: DummyNode) => (b.bst_root = np))

      expect(b.bst_root).to.be.equal(n1)
      expect(n1.equal_nodes[0]).to.be.equal(n2)
      expect(n1.right_node).to.be.equal(n3)
      expect(n3.right_node).to.be.equal(n4)

      expect(n1.absolute_value).to.be.equal(1)
      expect(n2.absolute_value).to.be.equal(1)
      expect(n3.absolute_value).to.be.equal(2)
      expect(n4.absolute_value).to.be.equal(3)
    })
    it('rearranges positive offset in equal nodes', () => {
      const n3 = new DummyNode(3)
      const n4 = new DummyNode(4)
      const n5 = new DummyNode(4, 5)
      const n6 = new DummyNode(4, 6)
      const n7 = new DummyNode(4, 7)
      b.add(n3)
      b.add(n4)
      b.add(n5)
      b.add(n6)
      b.add(n7)
      n6.addSpaceBefore(1)

      expect(b.bst_root).to.be.equal(n3)
      expect(n3.right_node).to.be.equal(n4)
      expect(n4.equal_nodes[0]).to.be.equal(n5)
      expect(n4.right_node).to.be.equal(n6)
      expect(n6.equal_nodes[0]).to.be.equal(n7)

      expect(n3.absolute_value).to.be.equal(3)
      expect(n4.absolute_value).to.be.equal(4)
      expect(n5.absolute_value).to.be.equal(4)
      expect(n6.absolute_value).to.be.equal(5)
      expect(n7.absolute_value).to.be.equal(5)
    })
    it('should offset newly added equal node', () => {
      const nn = new DummyNode(0, 0)
      const n0 = new DummyNode(0, 1)
      const n1 = new DummyNode(1, 2)
      const n2 = new DummyNode(2, 3)
      b.add(n0)
      b.add(n1)
      b.add(n2)
      b.add(nn)
      n0.addSpaceBefore(1, (np: DummyNode) => (b.bst_root = np))

      expect(nn.absolute_value).to.be.equal(0)
      expect(n0.absolute_value).to.be.equal(1)
      expect(n1.absolute_value).to.be.equal(2)
      expect(n2.absolute_value).to.be.equal(3)
    })
    it('equaling negative offset with cascading removals', () => {
      const n2 = new DummyNode(1, 1)
      const n3 = new DummyNode(6, 6) // Removed
      const n4 = new DummyNode(8, 8)
      const n5 = new DummyNode(14, 14)
      const n6 = new DummyNode(14, 15)
      b.add(n2)
      b.add(n4)
      b.add(n3)
      b.add(n5)
      b.add(n6)
      n4.addSpaceBefore(-2)
    })
    it('reordering of negative offset with cascarding removals', () => {
      const n0 = new DummyNode(0, 0)
      const n1 = new DummyNode(3, 3) // Removed
      const n2 = new DummyNode(5, 5)
      const n3 = new DummyNode(6, 6)
      const n4 = new DummyNode(11, 11)
      b.add(n0)
      b.add(n2)
      b.add(n1)
      b.add(n3)
      b.add(n4)
      n2.addSpaceBefore(-2)
    })
    describe('positive offset test', () => {
      const pt = (i: number) => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        const array = [n2, n3, n4, n5, n6, n7, n8]
        array[i].addSpaceBefore(1, (np: DummyNode) => (b.bst_root = np))
        array.forEach((node, n) => {
          let pos = n + 2
          if (n >= i) {
            pos++
          }
          expect(node.absolute_value).to.be.equal(pos)
        })
        expect(b.all_nodes.length).to.be.equal(array.length)
      }
      it('n2', () => pt(0))
      it('n3', () => pt(1))
      it('n4', () => pt(2))
      it('n5', () => pt(3))
      it('n6', () => pt(4))
      it('n7', () => pt(5))
      it('n8', () => pt(6))
    })
    describe('negative offset test', () => {
      const pt = (i: number) => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        const array = [n2, n3, n4, n5, n6, n7, n8]
        array[i].addSpaceBefore(-1, (np: DummyNode) => (b.bst_root = np))
        array.forEach((node, n) => {
          let pos = n + 2
          if (n >= i) {
            pos--
          }
          expect(node.absolute_value).to.be.equal(pos)
        })
        expect(b.all_nodes.length).to.be.equal(array.length)
      }
      it('n2', () => pt(0))
      it('n3', () => pt(1))
      it('n4', () => pt(2))
      it('n5', () => pt(3))
      it('n6', () => pt(4))
      it('n7', () => pt(5))
      it('n8', () => pt(6))
    })
  })

  describe('removals', () => {
    it('basic removal', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      n2.remove()
      expect(n3.left_node).to.be.equal(undefined)
    })
    it('removal with children', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      n3.remove()
      expect(n5.left_node).to.be.equal(n4)
      expect(n4.left_node).to.be.equal(n2)
      expect(n4.right_node).to.be.equal(undefined)
    })
    it('remove root', () => {
      const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
      n5.remove((p) => (b.bst_root = p))
      expect(b.bst_root).to.be.equal(n6)
      expect(b.bst_root.value).to.be.equal(6)
      expect(n6.left_node).to.be.equal(n3)
      expect(n6.left_node.value).to.be.equal(-3)
      expect(n6.right_node).to.be.equal(n7)
      expect(n6.right_node.value).to.be.equal(1)
      expect(n7.left_node).to.be.equal(undefined)
    })
    it('removal where inorder successor is equal node', () => {
      const n3 = new DummyNode(3)
      const n5 = new DummyNode(5)
      const n4 = new DummyNode(4)
      const n4n = new DummyNode(4, 3.5)
      b.add(n3)
      b.add(n5)
      b.add(n4)
      b.add(n4n)
      n3.remove((p) => (b.bst_root = p))
      expect(b.bst_root).to.be.equal(n5)
      expect(n5.value).to.be.equal(5)
      expect(n5.left_node).to.be.equal(n4n)
      expect(n4n.value).to.be.equal(-1)
      expect(n4n.equal_nodes[0]).to.be.equal(n4)
      expect(n4.value).to.be.equal(0)
    })
    it('removal where inorder successor is equal node with right', () => {
      const n3 = new DummyNode(3)
      const n6 = new DummyNode(6)
      const n4 = new DummyNode(4)
      const n5 = new DummyNode(5)
      const n4n = new DummyNode(4, 3.5)
      b.add(n3)
      b.add(n6)
      b.add(n4)
      b.add(n5)
      b.add(n4n)
      n3.remove((p) => (b.bst_root = p))

      expect(b.bst_root).to.be.equal(n6)
      expect(n6.value).to.be.equal(6)
      expect(n6.left_node).to.be.equal(n4n)
      expect(n4n.value).to.be.equal(-2)

      expect(n4n.equal_nodes[0]).to.be.equal(n4)
      expect(n4.value).to.be.equal(0)

      expect(n4n.right_node).to.be.equal(n5)
      expect(n5.value).to.be.equal(1)
    })
    it('removal replaces with equal node', () => {
      const n4 = new DummyNode(4)
      const n5 = new DummyNode(4, 5)
      const n6 = new DummyNode(4, 6)
      b.add(n4)
      b.add(n5)
      b.add(n6)
      n4.remove((n) => (b.bst_root = n))
      expect(b.bst_root).to.be.equal(n5)
      expect(n5.equal_nodes.length).to.be.equal(1)
      expect(n5.equal_nodes[0]).to.be.equal(n6)
    })
    describe('full tree removal test', () => {
      const pt = (i: number) => {
        const { n2, n3, n4, n5, n6, n7, n8 } = constructFullTree()
        const array = [n2, n3, n4, n5, n6, n7, n8]
        array[i].remove((n) => (b.bst_root = n))
        array.forEach((n) => expect(n.n).to.be.equal(n.p))
        expect(b.all_nodes.length).to.be.equal(array.length - 1)
      }
      it('n2', () => pt(0))
      it('n3', () => pt(1))
      it('n4', () => pt(2))
      it('n5', () => pt(3))
      it('n6', () => pt(4))
      it('n7', () => pt(5))
      it('n8', () => pt(6))
    })
  })
})