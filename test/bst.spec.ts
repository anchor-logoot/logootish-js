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
    it('should create/reorder linked list of equal values', () => {
      const n1 = new DummyNode(5, 3)
      const n2 = new DummyNode(5, 0)
      const n3 = new DummyNode(5, 6)
      b.add(n1)
      b.add(n2)
      b.add(n3)

      expect(b.bst_root).to.be.equal(n3)
      expect(n3.value).to.be.equal(5)
      expect(b.bst_root.left_node).to.be.equal(n1)
      expect(n1.value).to.be.equal(0)
      expect(b.bst_root.left_node.left_node).to.be.equal(n2)
      expect(n2.value).to.be.equal(0)
    })
    it('should move lesser node down if an equal node is inserted', () => {
      const n1 = new DummyNode(5, 6)
      const n2 = new DummyNode(2)
      const n3 = new DummyNode(5, 3)
      b.add(n1)
      b.add(n2)
      b.add(n3)

      expect(b.bst_root).to.be.equal(n1)
      expect(n1.value).to.be.equal(5)
      expect(b.bst_root.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(0)
      expect(b.bst_root.left_node.left_node).to.be.equal(n2)
      expect(n2.value).to.be.equal(-3)
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
    it('should replace the node if preferential_cmp says it is greater', () => {
      const n5 = new DummyNode(5)
      const n3 = new DummyNode(3)
      const n35 = new DummyNode(3, 3.5)

      b.add(n5)
      b.add(n3)
      b.add(n35)

      expect(n5.left_node).to.be.equal(n35)
      expect(n35.value).to.be.equal(-2)
      expect(n35.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(0)
    })
    it('should update root if necessary', () => {
      const n3 = new DummyNode(3)
      const n35 = new DummyNode(3, 3.5)

      b.add(n3)
      b.add(n35)

      expect(b.bst_root).to.be.equal(n35)
      expect(n35.value).to.be.equal(3)
      expect(n35.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(0)
    })
    it('replacement should preserve children', () => {
      const n5 = new DummyNode(5)
      const n3 = new DummyNode(3)
      const n2 = new DummyNode(2)
      const n4 = new DummyNode(4)
      const n35 = new DummyNode(3, 3.5)

      b.add(n5)
      b.add(n3)
      b.add(n2)
      b.add(n4)
      b.add(n35)

      expect(n5.left_node).to.be.equal(n35)
      expect(n35.value).to.be.equal(-2)
      expect(n35.left_node).to.be.equal(n3)
      expect(n3.value).to.be.equal(0)

      expect(n35.right_node).to.be.equal(n4)
      expect(n3.left_node).to.be.equal(n2)
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

        expect(d3.equal_parent).to.be.equal(n2)
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
      const n4n = new DummyNode(4, 4.5)
      n3.replaceWith(n4n)
      expect(n5.left_node).to.be.equal(n4n, 'Node is not in correct position')
      expect(n4n.parent_node).to.be.equal(n5, 'Parent is not correct')
      expect(n4n.left_node).to.be.equal(n4, 'Equal node was not nested')
      expect(n4.absolute_value).to.be.equal(4, 'Equal node value is wrong')
      expect(n4.left_node).to.be.equal(n2, 'Lesser node was not nested')
      expect(n2.absolute_value).to.be.equal(2, 'Lesser node value is wrong')
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

      expect(b.bst_root).to.be.equal(n2)
      expect(n2.left_node).to.be.equal(n1)
      expect(n2.right_node).to.be.equal(n3)
      expect(n3.right_node).to.be.equal(n4)
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
        let count = 0
        b.operateOnAll(() => (count++))
        expect(count).to.be.equal(array.length)
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
        let count = 0
        b.operateOnAll(() => (count++))
        expect(count).to.be.equal(array.length)
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
      expect(n5.left_node).to.be.equal(n4)
      expect(n4.value).to.be.equal(-1)
      expect(n4.left_node).to.be.equal(n4n)
      expect(n4n.value).to.be.equal(0)
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
      expect(n6.left_node).to.be.equal(n4)
      expect(n4.value).to.be.equal(-2)

      expect(n4.left_node).to.be.equal(n4n)
      expect(n4n.value).to.be.equal(0)

      expect(n4.right_node).to.be.equal(n5)
      expect(n5.value).to.be.equal(1)
    })
  })
})