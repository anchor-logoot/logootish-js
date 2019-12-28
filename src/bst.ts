/**
 * @file A binary search tree implementation for finding ranges within the tree
 * and finding neighboring nodes.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { DualCompareFunction, MemberPtr } from './utils'

/**
 * The node type used by the binary search tree
 */
class BstNode<T> {
  /**
   * The data contained in the node.
   */
  data: T
  left: BstNode<T> | undefined
  right: BstNode<T> | undefined
  constructor(data: T) {
    this.data = data
  }
}

/**
 * The pointer type either to a leaf of the BST or the root. By using
 * `MemberPtr`, methods in the BST can re-assign the node value simply through
 * this 'pointer' object.
 */
type BstNodePtr<T> =
  | MemberPtr<BstNode<T>, 'left'>
  | MemberPtr<BstNode<T>, 'right'>
  // eslint-disable-next-line
  | MemberPtr<Bst<T, any>, 'bst_root'>
/**
 * The type of a function that operates on nodes of the BST.
 */
type NodeOp<T> = (node: BstNode<T>) => void

/**
 * A binary search tree implementation for finding ranges within the tree and
 * finding neighboring nodes.
 * @template T - The type stored in the tree.
 * @template S - The type used by search functions, but that cannot be added to
 * the tree. It defaults to `T`.
 */
class Bst<T extends S, S = T> {
  bst_root: BstNode<T> | undefined = undefined
  readonly cmp: DualCompareFunction<S>

  /**
   * @param cmp - The compare function to use to sort the tree.
   */
  constructor(cmp: DualCompareFunction<S>) {
    this.cmp = cmp
  }

  gteqcmp(a: S, b: S): boolean {
    return this.cmp(a, b) >= 0
  }
  gtcmp(a: S, b: S): boolean {
    return this.cmp(a, b) > 0
  }
  eqcmp(a: S, b: S): boolean {
    return this.cmp(a, b) === 0
  }

  /**
   * Add an element to the tree.
   * @param object - The object to add to the tree.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  add(object: T, node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')): void {
    if (!node.value) {
      node.value = new BstNode(object)
    } else if (this.gteqcmp(node.value.data, object)) {
      this.add(object, new MemberPtr(node.value, 'left'))
    } else {
      this.add(object, new MemberPtr(node.value, 'right'))
    }
  }

  /**
   * A method designed mostly for internal use that finds the next element in
   * the tree if all of the elements were placed in order.
   * @param object - The object or search type to find the successor of
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  _getInorderSuccessor(
    object: S,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): { ptr: BstNodePtr<T>; data: T } | undefined {
    type SuccessorType = { ptr: BstNodePtr<T>; data: T } | undefined
    let successor: SuccessorType
    const setSuccessor = (s: SuccessorType): void => {
      if (!successor || (s && this.gtcmp(successor.data, s.data))) {
        successor = s
      }
    }
    if (node.value) {
      if (this.gteqcmp(node.value.data, object)) {
        if (!this.eqcmp(node.value.data, object)) {
          setSuccessor({ ptr: node, data: node.value.data })
        }
        setSuccessor(
          this._getInorderSuccessor(object, new MemberPtr(node.value, 'left'))
        )
      }
      setSuccessor(
        this._getInorderSuccessor(object, new MemberPtr(node.value, 'right'))
      )
    }
    return successor
  }
  /**
   * Remove an element from the tree.
   * @param object - The object to remove or a search type that is evaluated
   * to the same value as an object in the tree. Equivalence is determined
   * exclusively using the compare function.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  remove(
    object: S,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      const result = this.cmp(node.value.data, object)
      if (result > 0) {
        this.remove(object, new MemberPtr(node.value, 'left'))
      } else if (result < 0) {
        this.remove(object, new MemberPtr(node.value, 'right'))
      } else if (node.value.left && node.value.right) {
        const successor = this._getInorderSuccessor(node.value.data, node)

        this.remove(successor.data, successor.ptr)
        node.value.data = successor.data
      } else {
        node.value = node.value.left || node.value.right
      }
    }
  }

  /**
   * Perform an operation on all of the elements in a range.
   * @param start - The search type or object at which to start a search.
   * @param endm1 - The search type or object at which to end a search
   * inclusively. The name is `endm1` to stand for `END Minus 1` since the
   * search is performed inclusively.
   * @param operation - The function to run on each node.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   * @param undef - TODO: Fix
   */
  operateOnAllRange(
    start: S,
    endm1: S,
    operation: NodeOp<T>,
    node = this.bst_root,
    undef = false
  ): void {
    if (node && !undef) {
      if (this.gteqcmp(node.data, start)) {
        if (this.gteqcmp(endm1, node.data)) {
          this.operateOnAllRange(start, endm1, operation, node.left, !node.left)
          this.operateOnAllRange(
            start,
            endm1,
            operation,
            node.right,
            !node.right
          )
          operation(node)
        } else {
          this.operateOnAllRange(start, endm1, operation, node.left, !node.left)
        }
      } else {
        this.operateOnAllRange(start, endm1, operation, node.right, !node.right)
      }
    }
  }
  /**
   * Perform an operation on all of the elements greater than or equal to a
   * search type or object.
   * @param value - The search type or object at which to start a search.
   * @param operation - The function to run on each node.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  operateOnAllGteq(
    value: S,
    operation: NodeOp<T>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (this.gteqcmp(node.value.data, value)) {
        operation(node.value)
        this.operateOnAllGteq(
          value,
          operation,
          new MemberPtr(node.value, 'left')
        )
      }
      this.operateOnAllGteq(
        value,
        operation,
        new MemberPtr(node.value, 'right')
      )
    }
  }
  /**
   * Perform an operation on all of the elements less than or equal to a
   * search type or object.
   * @param value - The search type or object at which to end a search.
   * @param operation - The function to run on each node.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  operateOnAllLteq(
    value: S,
    operation: NodeOp<T>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (this.gteqcmp(value, node.value.data)) {
        operation(node.value)
        this.operateOnAllLteq(
          value,
          operation,
          new MemberPtr(node.value, 'right')
        )
      }
      this.operateOnAllLteq(value, operation, new MemberPtr(node.value, 'left'))
    }
  }

  /**
   * Perform an operation on all nodes.
   * @param operation - The function to run on each node.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  operateOnAll(
    operation: NodeOp<T>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      this.operateOnAll(operation, new MemberPtr(node.value, 'left'))
      operation(node.value)
      this.operateOnAll(operation, new MemberPtr(node.value, 'right'))
    }
  }

  /**
   * Get all the objects in a range.
   * @param start - The search type or object at which to start a search.
   * @param endm1 - The search type or object at which to end a search
   * inclusively. The name is `endm1` to stand for `END Minus 1` since the
   * search is performed inclusively.
   */
  getRange(start: S, endm1: S): (BstNode<T> | undefined)[] {
    const nodes: (BstNode<T> | undefined)[] = []
    this.operateOnAllRange(start, endm1, (n) => nodes.push(n))

    return nodes
  }
  /**
   * Get all the objects greater than or equal to an object or search type.
   * @param value - The search type or object at which to start a search.
   */
  getGteq(value: S): (BstNode<T> | undefined)[] {
    let nodes: (BstNode<T> | undefined)[] = []
    this.operateOnAllGteq(value, (n) => {
      if (!nodes[0] || this.gtcmp(nodes[0].data, n.data)) {
        nodes = [n]
      } else if (this.eqcmp(nodes[0].data, n.data)) {
        nodes.push(n)
      }
    })

    return nodes
  }
  /**
   * Get all the objects less than or equal to an object or search type.
   * @param value - The search type or object at which to end a search.
   */
  getLteq(value: S): (BstNode<T> | undefined)[] {
    let nodes: (BstNode<T> | undefined)[] = []
    this.operateOnAllLteq(value, (n) => {
      if (!nodes[0] || this.gtcmp(n.data, nodes[0].data)) {
        nodes = [n]
      } else if (this.eqcmp(nodes[0].data, n.data)) {
        nodes.push(n)
      }
    })

    return nodes
  }

  toString(): string {
    let str = 'BST [\n'
    this.operateOnAll(({ data }) => {
      str +=
        '  ' +
        data
          .toString()
          .split('\n')
          .join('\n  ') +
        '\n'
    })
    str += ']'
    return str
  }
}

export { Bst, BstNode }
