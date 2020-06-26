/**
 * @file A binary search tree implementation for finding ranges within the tree
 * and finding neighboring nodes. The documentation for this is, erm, not super
 * amazing.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import 'regenerator-runtime/runtime'

import { CompareResult, FatalError } from './utils'
import { TypeRange, NumberRange } from './compare'

class TypeRangeSearch<T, R> {
  readonly buckets: {
    lesser: [T, R][]
    range: [T, R][]
    greater: [T, R][]
  } = { lesser: [], range: [], greater: [] }
  constructor(public range: TypeRange<T>) {}

  addToBucket(bucket: 'lesser' | 'range' | 'greater', val: T, obj: R): void {
    this.buckets[bucket].push([val, obj])
  }
  setBucket(bucket: 'lesser' | 'greater', val: T, obj: R): void {
    let cval: CompareResult
    if (
      !this.buckets[bucket].length ||
      (cval = this.range.cf(val, this.buckets[bucket][0][0])) === 0
    ) {
      this.buckets[bucket].push([val, obj])
      return
    }
    if (bucket === 'lesser' && cval > 0) {
      this.buckets.lesser = [[val, obj]]
    } else if (bucket === 'greater' && cval < 0) {
      this.buckets.greater = [[val, obj]]
    }
  }
}

const noRootUpdateFunction = (): void => {
  throw new TypeError(
    'No root update function was provided, but a root update was attempted'
  )
}

abstract class DBstNode<T extends DBstNode<T>> {
  parent_node?: T
  left_node?: T
  right_node?: T
  readonly equal_nodes: T[] = []

  constructor(public value: number = 0) {}

  /**
   * The actual value of this node. The `value` member only stores the value
   * *relative to the parent node.*
   */
  get absolute_value(): number {
    return this.value + (this.parent_node ? this.parent_node.absolute_value : 0)
  }

  /**
   * Order nodes that have the same `value` may be ordered differently using
   * this function. This function must follow these rules:
   * 1. It must return values other than 0 if multiple nodes may have the
   * same `value` in your implementation. Basically, if you ever have zero
   * length nodes or nodes with the same position, you **have** to use this for
   * things to not break.
   * 2. It must define the same order as if the nodes were ordered by value
   * (with the exception of unorderable equal nodes).
   */
  abstract preferential_cmp(other: T): CompareResult

  /**
   * Called by the BST only. **DO NOT** use. This is only public because JS has
   * no concept of C++ `friend` classes and I need to use this function in unit
   * tests. Call the `add` function on the BST object instead.
   * @param node The node to add
   * @param rootUpdate A function that will be called if the BST root needs to
   * be updated. A TypeError will be thrown if one is not provided.
   */
  addChild(node: T, rootUpdate: (np: T) => void = noRootUpdateFunction): void {
    node.value -= this.value
    if (node.value > 0) {
      if (this.right_node) {
        this.right_node.addChild(node)
      } else {
        this.right_node = node as T
        // T will always be an instance of DBstNode<T>
        ;(node as DBstNode<T>).parent_node = (this as unknown) as T
      }
    } else if (node.value < 0) {
      if (this.left_node) {
        this.left_node.addChild(node)
      } else {
        this.left_node = node as T
        ;(node as DBstNode<T>).parent_node = (this as unknown) as T
      }
    } else {
      if (this.preferential_cmp(node) > 0) {
        if (this.parent_node) {
          if (this.value > 0) {
            this.parent_node.right_node = node
          } else {
            this.parent_node.left_node = node
          }
          node.parent_node = this.parent_node
        } else {
          rootUpdate(node)
        }

        node.value = this.value
        this.value = 0

        if (this.left_node) {
          node.left_node = this.left_node
          delete this.left_node
          node.left_node.parent_node = node
        }
        if (this.right_node) {
          node.right_node = this.right_node
          delete this.right_node
          node.right_node.parent_node = node
        }

        node.equal_nodes.push((this as unknown) as T, ...this.equal_nodes)
        this.equal_nodes.length = 0
        node.equal_nodes.forEach((n) => (n.parent_node = node))
      } else {
        node.parent_node = (this as unknown) as T
        for (let i = this.equal_nodes.length - 1; i >= 0; i--) {
          if (this.equal_nodes[i].preferential_cmp(node) < 0) {
            this.equal_nodes.splice(i + 1, 0, node)
            return
          }
        }
        this.equal_nodes.unshift(node)
      }
    }
  }

  /**
   * Finds the smallest child of this node **not** including equal nodes.
   */
  get smallest_child(): T {
    if (this.left_node) {
      return this.left_node.smallest_child || this.left_node
    } else if (this.right_node) {
      return this.right_node.smallest_child || this.right_node
    }
    return undefined
  }
  /**
   * Finds the smallest child that is smaller than this node **not** including
   * equal nodes.
   */
  get smallest_smaller_child(): T {
    if (this.left_node) {
      return this.left_node.smallest_smaller_child || this.left_node
    }
    return undefined
  }
  /**
   * Finds the largest child of this node **not** including equal nodes.
   */
  get largest_child(): T {
    if (this.right_node) {
      return this.right_node.largest_child || this.right_node
    } else if (this.left_node) {
      return this.left_node.largest_child || this.left_node
    }
    return undefined
  }
  /**
   * Finds the largest child that is larger than this node **not** including
   * equal nodes.
   */
  get largest_larger_child(): T {
    if (this.right_node) {
      return this.right_node.largest_larger_child || this.right_node
    }
    return undefined
  }

  /**
   * The highest parent of this node that has the same value or this node if
   * there is no such node.
   */
  get equal_parent(): T {
    if (this.value === 0 && this.parent_node) {
      return this.parent_node.equal_parent
    }
    return (this as unknown) as T
  }
  /**
   * The root of the BST.
   */
  get root(): T {
    return this.parent_node ? this.parent_node.root : ((this as unknown) as T)
  }

  /**
   * The next node in sequence.
   */
  get inorder_successor(): T {
    if (this.equal_nodes.length) {
      return this.equal_nodes[0]
    }
    if (this.right_node) {
      return this.right_node.smallest_smaller_child || this.right_node
    }
    if (this.value === 0 && this.parent_node?.right_node) {
      return this.parent_node.right_node.smallest_smaller_child ||
        this.parent_node.right_node
    }
    let node = (this as undefined) as T
    while (node) {
      // If we're in an equal node set, find the next node
      if (node.value === 0) {
        if (!node.parent_node) {
          return undefined
        }
        const eqn = node.parent_node.equal_nodes
        const s = eqn[eqn.indexOf(node) + 1]
        if (s) {
          return s
        }
      }
      // Return parent if to left
      if (
        node.value <= 0 &&
        node.parent_node &&
        node.parent_node.left_node === node
      ) {
        return node.parent_node
      }
      // Otherwise, traverse up
      node = node.parent_node
    }
    return undefined
  }
  *successorIterator(): IterableIterator<T> {
    let node: T = (this as unknown) as T
    while ((node = node.inorder_successor)) {
      yield node
    }
  }

  /**
   * The previous node in sequence.
   */
  get inorder_predecessor(): T {
    if (this.left_node) {
      const node = this.left_node.largest_larger_child || this.left_node
      if (node.equal_nodes.length) {
        return node.equal_nodes[node.equal_nodes.length - 1]
      }
      return node
    }
    let node = (this as undefined) as T
    while (node) {
      if (node.value === 0) {
        if (!node.parent_node) {
          return undefined
        }
        const eqn = node.parent_node.equal_nodes
        const i = eqn.indexOf(node)
        if (i === 0) {
          return node.parent_node
        }
        const s = eqn[i - 1]
        if (s) {
          return s
        }
      }
      if (
        node.value > 0 &&
        node.parent_node &&
        node.parent_node.right_node === node
      ) {
        if (node.parent_node.equal_nodes.length) {
          const eqn = node.parent_node.equal_nodes
          return eqn[eqn.length - 1]
        }
        return node.parent_node
      }
      node = node.parent_node
    }
    return undefined
  }
  *predecessorIterator(): IterableIterator<T> {
    let node: T = (this as unknown) as T
    while ((node = node.inorder_predecessor)) {
      yield node
    }
  }

  /**
   * **THIS IS NOT INTENDED FOR OUTSIDE USE!** It is not protected for the unit
   * tests that rely on it.
   *
   * Replaces this node with another node. This is used internally by the
   * `remove` function. If the node provided has a parent, it will be removed
   * from the parent. **WARNING:** If the provided node's current children
   * conflict with the children of the destination node, the destination node's
   * children have priority.
   * @param data New node
   * @param rootUpdate A function that will be called if the BST root needs to
   * be updated. A TypeError will be thrown if one is not provided.
   * @param value The value to use for the new node. It defaults to the node's
   * `absolute_value`.
   */
  replaceWith(
    data: T,
    rootUpdate: (np: T) => void = noRootUpdateFunction,
    value = data?.absolute_value
  ): T {
    // First, set up the new node
    if (data) {
      data.value = value - this.absolute_value + this.value
    }
    if (data) {
      if (data.parent_node) {
        let index
        if (data.parent_node.left_node === data) {
          delete data.parent_node.left_node
        } else if (data.parent_node.right_node === data) {
          delete data.parent_node.right_node
        } else if ((index = data.parent_node.equal_nodes.indexOf(data)) >= 0) {
          data.parent_node.equal_nodes.splice(index, 1)
        }
        delete data.parent_node
      }
    }
    // Set up parent node
    if (this.parent_node) {
      // Value cannot be relied upon here; The DBST may be temporarily corrupt
      if (this.parent_node.left_node === ((this as unknown) as T)) {
        this.parent_node.left_node = data
      }
      if (this.parent_node.right_node === ((this as unknown) as T)) {
        this.parent_node.right_node = data
      }
      let index
      if (
        (index = this.parent_node.equal_nodes.indexOf((this as unknown) as T))
        >= 0
      ) {
        this.parent_node.equal_nodes.splice(index, 1, data)
      }
    } else {
      rootUpdate(data)
    }
    if (data) {
      data.parent_node = this.parent_node
    }

    // Transplant children
    if (data && this.left_node && this.left_node !== data) {
      data.left_node = this.left_node
      data.left_node.parent_node = data
      data.left_node.value += this.value - data.value
    }
    if (data && this.right_node && this.right_node !== data) {
      data.right_node = this.right_node
      data.right_node.parent_node = data
      data.right_node.value += this.value - data.value
    }
    if (this.equal_nodes.length) {
      throw new TypeError('Node cannot currently have equal nodes')
    }

    // Clear out this node
    delete this.parent_node
    delete this.right_node
    delete this.left_node

    // Ensure that the right side does not contain equal nodes. This can happen
    // if nodes are replaced in order, but the new node has the same value.
    // TODO: Decide if necessary
    let node = data?.right_node
    let traversal_value = 0
    while (node) {
      traversal_value += node.value
      if (traversal_value === 0) {
        if (node.left_node) {
          throw new TypeError(
            'Out-of-order offset must have been attempted: There are' +
            'non-successor nodes with equal value'
          )
        }
        break
      }
      node = node.left_node
    }
    if (node) {
      data.equal_nodes.push(node, ...node.equal_nodes)
      node.equal_nodes.forEach((n) => (n.parent_node = data))
      node.equal_nodes.length = 0

      if (node === data.right_node) {
        delete data.right_node
      } else {
        delete node.parent_node.left_node
      }
      node.parent_node = data
      node.value = 0
    }

    node = data?.left_node
    traversal_value = 0
    while (node) {
      traversal_value += node.value
      if (traversal_value === 0) {
        if (node.right_node) {
          throw new TypeError(
            'Out-of-order offset must have been attempted: There are' +
            'non-successor nodes with equal value'
          )
        }
        break
      }
      node = node.right_node
    }
    if (node) {
      data.replaceWith(node)
      node.equal_nodes.push(data, ...data.equal_nodes)
      data.equal_nodes.forEach((n) => (n.parent_node = node))
      data.parent_node = node
      data.equal_nodes.length = 0
      data.value = 0
    }

    return (this as unknown) as T
  }

  remove(rootUpdate: (np: T) => void = noRootUpdateFunction): void {
    let cnode: T
    // A node to "return" to the DBST. This is set when the inorder successor
    // is equal to its parents. In that case, the greatest equal parent is
    // chosen and and children are placed in `return_node`
    const return_children: T[] = []
    if (this.equal_nodes.length) {
      cnode = this.equal_nodes.shift()
      cnode.equal_nodes.push(...this.equal_nodes)
      this.equal_nodes.forEach((n) => (n.parent_node = cnode))
      this.equal_nodes.length = 0
      cnode.value = this.absolute_value
    } else if (this.right_node && this.left_node) {
      cnode = this.inorder_successor
      while (cnode.value === 0) {
        cnode = cnode.parent_node
      }

      // Pull out children
      if (cnode.left_node) {
        return_children.push(cnode.left_node)
        delete cnode.left_node.parent_node
        delete cnode.left_node
      }
      if (cnode.right_node) {
        return_children.push(cnode.right_node)
        delete cnode.right_node.parent_node
        delete cnode.right_node
      }

      // Keep the value here while we remove (`remove` needs the tree to
      // be preserved)
      const absval = cnode.absolute_value
      cnode.remove(rootUpdate)
      cnode.value = absval
    } else if (this.right_node) {
      cnode = this.right_node
      cnode.value = cnode.absolute_value
    } else if (this.left_node) {
      cnode = this.left_node
      cnode.value = cnode.absolute_value
    } else {
      cnode = undefined
    }
    this.replaceWith(cnode, rootUpdate, cnode?.value)

    let node = cnode
    while (node?.parent_node && node.value === 0) {
      node = node.parent_node
    }
    return_children.forEach((c) => node.addChild(c))
  }
  removeChild(
    value: number,
    filter: (data: T) => boolean = (): boolean => true,
    vals: T[] = [],
    rootUpdate: (np: T) => void = (): void => undefined
  ): T[] {
    const tryRmLeft = (): void => {
      if (this.left_node) {
        this.left_node.removeChild(value - this.left_node.value, filter, vals)
      }
    }
    const tryRmRight = (): void => {
      if (this.right_node) {
        this.right_node.removeChild(value - this.right_node.value, filter, vals)
      }
    }
    if (value <= 0) {
      tryRmLeft()
    } else {
      tryRmRight()
    }
    if (value === 0 && filter((this as unknown) as T)) {
      vals.push((this as unknown) as T)
      this.remove(rootUpdate)
    }
    return vals
  }

  /**
   * Applies an offset to the node's starting position. This will offset all
   * nodes after this one efficiently. There's just one catch: This **may not**
   * change the order of the BST. No errors will be thrown (or can, efficiently
   * at least), so just make sure your code doesn't change the order. This will
   * not mutate the BST *unless* the position of a node becomes equal to that
   * of another node. In that case, the BST will be re-arranged so that the
   * equal nodes form a linked list under the left side of the root equal node
   * as required.
   * @param s The offset to apply to this node's start. This may be positive to
   * add space before or negative to remove space before.
   * @param rootUpdate A function that will be called if the BST root needs to
   * be updated. A TypeError will be thrown if one is not provided.
   */
  addSpaceBefore(
    s: number,
    rootUpdate: (np: T) => void = noRootUpdateFunction
  ): void {
    // Option 1: Move nodes before
    let node = this.inorder_predecessor
    // If we've found the child of an equal node, set the node to its parent
    if (node && node.value === 0) {
      node = node.parent_node || node
    }
    // Possibly move to `node`'s `equal_node`s
    if (s < 0 && node && node.absolute_value === this.absolute_value + s) {
      const equal_nodes = [...this.equal_nodes]
      this.equal_nodes.length = 0
      this.remove(rootUpdate)
      node.equal_nodes.push((this as unknown) as T, ...equal_nodes)
      equal_nodes.forEach((n) => (n.parent_node = node))

      this.value = -s
      this.parent_node = node
      if (node.right_node) {
        node.right_node.value += s
      }
    }

    let id
    if (
      s > 0 &&
      this.parent_node &&
      (id = this.parent_node.equal_nodes.indexOf((this as unknown) as T)) >= 0
    ) {
      const old_parent = this.parent_node
      old_parent.equal_nodes.splice(id, 1)
      this.equal_nodes.push(
        ...old_parent.equal_nodes.splice(
          id,
          old_parent.equal_nodes.length - id
        )
      )
      this.equal_nodes.forEach((n) => (n.parent_node = (this as unknown) as T))

      // Now, move into the right position. The value of 1 is required so that
      // the incrementing loop below functions correctly.
      this.value = 1
      if (old_parent.right_node) {
        this.right_node = old_parent.right_node
        this.right_node.parent_node = (this as unknown) as T
      }
      old_parent.right_node = (this as unknown) as T
      this.parent_node = old_parent
    }

    let next = (this as unknown) as T
    let cumulative = 0
    while (next) {
      // Increment `next` value if it's greater than `this`
      if (cumulative >= 0) {
        cumulative -= next.value
        next.value += s
        // Ensure that the left node's position is not changed
        if (next.left_node) {
          next.left_node.value -= s
        }
      } else {
        cumulative -= next.value
      }
      next = next.parent_node
    }

    // Option 2: Move nodes after
    /* let node = this.inorder_predecessor || this.parent_node
    // If we've found the child of an equal node, set the node to its parent
    if (node && node.value === 0) {
      node = node.parent_node || node
    }
    // Possibly move to `node`'s `equal_node`s
    if (s < 0 && node && node.absolute_value === this.absolute_value) {
      this.remove(rootUpdate)
      this.value = node.value
      node.addChild((this as unknown) as T)
    } */

    // This is just a sneaky way to check if the `if` statement above ran
    if (id >= 0) {
      // Subtract out the residual 1
      this.value -= 1
    }
  }

  search(s: TypeRangeSearch<number, T>, cval: number): void {
    cval += this.value
    ;(s.range as NumberRange).push_offset(-this.value)

    const traverse_left = (): void => {
      this.left_node.search(s, cval)
    }
    const traverse_right = (): void => {
      this.right_node.search(s, cval)
    }

    const sec = s.range.getRangeSection(0)
    if (sec < 0) {
      // We're under the target range...

      // Try assigning this or the last equal node to a bucket (if the current
      // value is greater, this will be ignored.)
      s.setBucket('lesser', cval, (this as unknown) as T)
      this.equal_nodes.forEach((n) => s.setBucket('lesser', cval, n))
      // Always traverse right since it could be greater
      if (this.right_node) {
        traverse_right()
      }
    } else if (sec > 0) {
      // We're above the target range...

      // The same as above, but with the `greater` bucket
      s.setBucket('greater', cval, (this as unknown) as T)
      this.equal_nodes.forEach((n) => s.setBucket('greater', cval, n))
      // Always try to find a smaller node
      if (this.left_node) {
        traverse_left()
      }
    } else {
      // We're in the target range...

      s.addToBucket('range', cval, (this as unknown) as T)
      this.equal_nodes.forEach((n) => s.addToBucket('range', cval, n))
      // Now, we have to traverse left **and** right
      if (this.left_node) {
        traverse_left()
      }
      if (this.right_node) {
        traverse_right()
      }
    }

    ;(s.range as NumberRange).pop_offset(-this.value)
  }

  prefSearch(s: TypeRangeSearch<T, T>): void {
    const traverse_left = (): void => {
      this.left_node.prefSearch(s)
    }
    const traverse_right = (): void => {
      this.right_node.prefSearch(s)
    }
    const traverse_equal = (): void => {
      this.equal_nodes.forEach((n) => n.prefSearch(s))
    }
    const bucket = (name: 'lesser' | 'range' | 'greater', val: T) => {
      // In this case, both the value and node are the same
      if (name === 'range') {
        s.addToBucket(name, val, val)
      } else {
        s.setBucket(name, val, val)
      }
    }

    const sec = s.range.getRangeSection((this as unknown) as T)
    if (sec < 0) {
      // We're under the target range...

      // Try assigning this to a bucket (if the current value is greater, this)
      // will be ignored.
      bucket(
        'lesser',
        this.equal_nodes[this.equal_nodes.length - 1] || (this as unknown) as T
      )
      // Always traverse right since it could be greater
      if (this.right_node) {
        traverse_right()
      }
    } else if (sec > 0) {
      // We're above the target range...

      // The same as above, but with the `greater` bucket
      bucket('greater', (this as unknown) as T)
      // Always try to find a smaller node
      if (this.left_node) {
        traverse_left()
      }
    } else {
      // We're in the target range...

      bucket('range', (this as unknown) as T)
      traverse_equal()
      // Now, we have to traverse left **and** right
      if (this.left_node) {
        traverse_left()
      }
      if (this.right_node) {
        traverse_right()
      }
    }
  }

  operateOnAll(cb: (data: T) => void): void {
    if (this.left_node) {
      this.left_node.operateOnAll(cb)
    }
    cb((this as unknown) as T)
    this.equal_nodes.forEach((n) => cb(n))
    if (this.right_node) {
      this.right_node.operateOnAll(cb)
    }
  }

  /**
   * Creates a virtual tree showing right, left, and equal nodes. Very useful
   * when debugging BST issues.
   */
  toDeepString(): string {
    let str = `${this}\n` + this.equal_nodes.map((n) => `${n}\n`).join('')
    const dstr = (node: T): string =>
      node.toDeepString().split('\n').join('\n    ')
    if (this.left_node) {
      str += `  L: ${dstr(this.left_node)}\n`
    } else {
      str += '  L: undefined\n'
    }
    if (this.right_node) {
      str += `  R: ${dstr(this.right_node)}`
    } else {
      str += '  R: undefined'
    }
    return str
  }

  selfTest(
    parent?: T,
    is_left?: boolean,
    mnv = 0,
    mxv = 0,
    known: DBstNode<T>[] = []
  ): void {
    if (known.includes(this)) {
      throw new Error('Duplicate nodes or node loop')
    }
    known.push(this)
    if (this.value <= mnv) {
      throw new Error('Node has wrong position for location')
    } else if (this.value >= mxv) {
      throw new Error('Node has wrong position for location')
    }
    if (this.parent_node !== parent) {
      throw new Error('Node does not have correct parent')
    }
    if (is_left === true && this.value > 0) {
      throw new Error('Node has wrong value for location')
    } else if (is_left === false && this.value <= 0) {
      throw new Error('Node has wrong value for location')
    }
    if (this.left_node) {
      this.left_node.selfTest(
        (this as unknown) as T,
        true,
        mnv - this.value,
        0,
        known
      )
    }
    if (this.right_node) {
      this.right_node.selfTest(
        (this as unknown) as T,
        false,
        0,
        mxv - this.value,
        known
      )
    }
    this.equal_nodes.forEach((n) => n.selfTestEqual((this as unknown) as T))
    let last = this
    this.equal_nodes.forEach((node) => {
      if (last.preferential_cmp(node) >= 0) {
        throw new Error('Equal nodes are not sequential')
      }
    })
  }
  selfTestEqual(parent?: T, known: DBstNode<T>[] = []): void {
    if (known.includes(this)) {
      throw new Error('Duplicate nodes or node loop')
    }
    known.push(this)
    if (this.value !== 0) {
      throw new Error('Equal nodes cannot have value')
    }
    if (this.parent_node !== parent) {
      throw new Error('Node does not have correct parent')
    }
    if (this.right_node || this.left_node || this.equal_nodes.length) {
      throw new Error('Equal nodes cannot have children')
    }
  }
}

class DBst<T extends DBstNode<T>> {
  bst_root?: T = undefined

  add(node: T): T {
    if (!this.bst_root) {
      this.bst_root = node
    } else {
      this.bst_root.addChild(node, (n) => (this.bst_root = n))
    }
    return node
  }
  remove(
    value: number,
    filter: (data: T) => boolean = (): boolean => true
  ): T[] {
    const vals: T[] = []
    if (this.bst_root) {
      this.bst_root.removeChild(
        value - this.bst_root.value,
        filter,
        vals,
        (p: T) => {
          this.bst_root = p
        }
      )
    }
    return vals
  }
  removeNode(node: T): void {
    node.remove((np: T) => (this.bst_root = np))
  }

  search(range: NumberRange): TypeRangeSearch<number, T> {
    const search = new TypeRangeSearch<number, T>(range)
    if (this.bst_root) {
      this.bst_root.search(search, 0)
    }
    return search
  }
  prefSearch(range: TypeRange<T>): TypeRangeSearch<T, T> {
    const search = new TypeRangeSearch<T, T>(range)
    if (this.bst_root) {
      this.bst_root.prefSearch(search)
    }
    return search
  }

  operateOnAll(cb: (data: T) => void): void {
    if (this.bst_root) {
      this.bst_root.operateOnAll(cb)
    }
  }

  get all_nodes(): T[] {
    const nodes: T[] = []
    this.operateOnAll((n) => nodes.push(n))
    return nodes
  }

  toString(): string {
    let str = 'DBST [\n'
    this.operateOnAll((data) => {
      str += '  ' + data.toString().split('\n').join('\n  ') + '\n'
    })
    str += ']'
    return str
  }

  toDeepString(): string {
    let str = `DBST [\n`
    if (this.bst_root) {
      str += '  ' + this.bst_root.toDeepString()
    }
    str += '\n]'
    return str
  }

  selfTest(): void {
    if (this.bst_root) {
      this.bst_root.selfTest(undefined, undefined, -Infinity, Infinity)
    }
  }
}

export { DBst, DBstNode }
