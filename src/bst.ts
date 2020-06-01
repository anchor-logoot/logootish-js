/**
 * @file A binary search tree implementation for finding ranges within the tree
 * and finding neighboring nodes. The documentation for this is, erm, not super
 * amazing.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */
import 'regenerator-runtime/runtime'

import { CompareResult } from './utils'
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
   * no concept of C++ `friend` classes. Call the `add` function on the BST
   * object.
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
    } else {
      if (node.value === 0) {
        if (this.preferential_cmp(node) < 0) {
          if (this.parent_node) {
            if (this.value <= 0) {
              this.parent_node.left_node = node
            } else {
              this.parent_node.right_node = node
            }
          } else if (rootUpdate) {
            rootUpdate(node)
          } else {
            throw new Error('Unexpected undefined parent node in DBST')
          }
          node.parent_node = this.parent_node
          const old_right = this.right_node
          node.value = this.value

          if (node.right_node) {
            node.right_node.parent_node = node
          }
          delete this.right_node
          node.addChild((this as unknown) as T)
          if (old_right) {
            old_right.value += node.value
            node.addChild(old_right)
          }
          return
        } else if (this.left_node && this.left_node.value !== 0) {
          node.parent_node = (this as unknown) as T
          node.left_node = this.left_node
          delete node.right_node

          this.left_node.parent_node = node
          this.left_node = node
          return
        }
      }
      if (this.left_node) {
        this.left_node.addChild(node)
      } else {
        this.left_node = node as T
        ;(node as DBstNode<T>).parent_node = (this as unknown) as T
      }
    }
  }

  /**
   * Finds the smallest child of this node.
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
   * Finds the smallest child that is smaller than this node.
   */
  get smallest_smaller_child(): T {
    if (this.left_node) {
      return this.left_node.smallest_smaller_child || this.left_node
    }
    return undefined
  }
  /**
   * Finds the largest child of this node.
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
   * Finds the largest child that is larger than this node.
   */
  get largest_larger_child(): T {
    if (this.right_node) {
      return this.right_node.largest_larger_child || this.right_node
    }
    return undefined
  }

  /**
   * The highest parent of this node that has the same value.
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
    if (this.right_node) {
      return this.right_node.smallest_smaller_child || this.right_node
    }
    let node = (this as undefined) as T
    while (node) {
      if (
        node.value <= 0 &&
        node.parent_node &&
        node.parent_node.left_node === node
      ) {
        return node.parent_node
      }
      node = node.parent_node
    }
    return undefined
  }
  *successorIterator(): IterableIterator<T> {
    let node: T = (this as unknown) as T
    while (node = node.inorder_successor) {
      yield node
    }
  }

  /**
   * The previous node in sequence.
   */
  get inorder_predecessor(): T {
    if (this.left_node) {
      return this.left_node.largest_larger_child || this.left_node
    }
    let node = (this as undefined) as T
    while (node) {
      if (
        node.value > 0 &&
        node.parent_node &&
        node.parent_node.right_node === node
      ) {
        return node.parent_node
      }
      node = node.parent_node
    }
    return undefined
  }
  *predecessorIterator(): IterableIterator<T> {
    let node: T = (this as unknown) as T
    while (node = node.inorder_predecessor) {
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
        if (data.parent_node.left_node === data) {
          delete data.parent_node.left_node
        } else if (data.parent_node.right_node === data) {
          delete data.parent_node.right_node
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

    // Clear out this node
    delete this.parent_node
    delete this.right_node
    delete this.left_node

    // Ensure that the right side does not contain equal nodes. This can happen
    // if nodes are replaced in order, but the new node has the same value.
    if (data && data.right_node && data.right_node.value === 0) {
      data.right_node.value += data.value
      delete data.right_node.parent_node
      const node = data.right_node
      delete data.right_node
      data.addChild(node, rootUpdate)
    }

    return (this as unknown) as T
  }

  remove(rootUpdate: (np: T) => void = noRootUpdateFunction): void {
    let cnode: T
    // A node to "return" to the DBST. This is set when the inorder successor
    // is equal to its parents. In that case, the greatest equal parent is
    // chosen and and children are placed in `return_node`
    let return_node: T
    if (this.right_node && this.left_node) {
      cnode = this.inorder_successor
      while (cnode.value === 0) {
        cnode = cnode.parent_node
      }
      // If there is a right node, it can be spliced back into the DBST by
      // the `removeChild` function
      if (cnode.left_node) {
        return_node = cnode.left_node
        delete cnode.left_node.parent_node
        delete cnode.left_node
      }

      // Keep the value here while we remove (`removeChild` needs the tree to
      // be preserved)
      const absval = cnode.absolute_value
      cnode.parent_node.removeChild(cnode.value, (n) => n === cnode)
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
    // parentUpdate(cnode)
    this.replaceWith(cnode, rootUpdate, cnode?.value)

    if (return_node) {
      return_node.value += cnode.value
      cnode.addChild(return_node, rootUpdate)
    }
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
    let next = (this as unknown) as T
    let cumulative = 0
    while (next) {
      // Increment `next` value if it's greater than `this`
      if (cumulative >= 0 /*&& this.preferential_cmp(next) <= 0*/) {
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

    next = (this as unknown) as T
    let last = next
    cumulative = 0
    while (next) {
      if (cumulative === 0) {
        if (last.parent_node && next !== ((this as unknown) as T)) {
          last.value = next.value
          if (last.parent_node.left_node === last) {
            delete last.parent_node.left_node
          } else if (last.parent_node.right_node === last) {
            delete last.parent_node.right_node
          }
          delete last.parent_node

          next.addChild(last, !next.parent_node ? rootUpdate : undefined)
          last = next
        }
      }

      cumulative -= next.value
      next = next.parent_node
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

      // Try assigning this to a bucket (if the current value is greater, this)
      // will be ignored.
      s.setBucket('lesser', cval, (this as unknown) as T)
      // Always traverse right since it could be greater
      if (this.right_node) {
        traverse_right()
      }
      // Traverse left if the left node is equal (zero offset)
      if (this.left_node && this.left_node.value === 0) {
        traverse_left()
      }
    } else if (sec > 0) {
      // We're above the target range...

      // The same as above, but with the `greater` bucket
      s.setBucket('greater', cval, (this as unknown) as T)
      // Always try to find a smaller node
      if (this.left_node) {
        traverse_left()
      }
    } else {
      // We're in the target range...

      s.addToBucket('range', cval, (this as unknown) as T)
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
    const sec = s.range.getRangeSection((this as unknown) as T)
    if (sec < 0) {
      // We're under the target range...

      // Try assigning this to a bucket (if the current value is greater, this)
      // will be ignored.
      s.setBucket('lesser', (this as unknown) as T, (this as unknown) as T)
      // Always traverse right since it could be greater
      if (this.right_node) {
        traverse_right()
      }
      // Traverse left if the left node is equal (zero offset)
      if (this.left_node && this.left_node.value === 0) {
        traverse_left()
      }
    } else if (sec > 0) {
      // We're above the target range...

      // The same as above, but with the `greater` bucket
      s.setBucket('greater', (this as unknown) as T, (this as unknown) as T)
      // Always try to find a smaller node
      if (this.left_node) {
        traverse_left()
      }
    } else {
      // We're in the target range...

      s.addToBucket('range', (this as unknown) as T, (this as unknown) as T)
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
    if (this.right_node) {
      this.right_node.operateOnAll(cb)
    }
  }

  toDeepString(): string {
    let str = `${this}\n`
    const dstr = (node: T): string =>
      node.toDeepString().split('\n').join('\n  ')
    if (this.left_node) {
      str += `    L: ${dstr(this.left_node)}\n`
    } else {
      str += '    L: undefined\n'
    }
    if (this.right_node) {
      str += `    R: ${dstr(this.right_node)}`
    } else {
      str += '    R: undefined'
    }
    return str
  }

  selfTest(
    parent?: T,
    is_left?: boolean,
    mnv = 0,
    mxv = 0,
    known: DBstNode<T>[] = [],
    can_have_equal = false
  ): void {
    if (known.includes(this)) {
      throw new Error('Duplicate nodes or node loop')
    }
    known.push(this)
    if (this.value <= mnv) {
      throw new Error('Node has wrong position for location')
    } else if (this.value > mxv) {
      throw new Error('Node has wrong position for location')
    } else if (this.value === mxv && !can_have_equal) {
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
        known,
        true // The child CAN be equal here since it would start a linked list
        // of equal children
      )
    }
    if (this.right_node) {
      this.right_node.selfTest(
        (this as unknown) as T,
        false,
        0,
        mxv - this.value,
        known,
        can_have_equal
      )
    }
  }
}

class DBst<T extends DBstNode<T>> {
  bst_root?: T = undefined

  add(node: T): T {
    if (!this.bst_root) {
      this.bst_root = node
    } else {
      if (
        node.value === this.bst_root.value &&
        this.bst_root.preferential_cmp(node) < 0
      ) {
        node.left_node = this.bst_root
        node.left_node.parent_node = node
        node.left_node.value = 0

        node.right_node = this.bst_root.right_node
        if (node.right_node) {
          node.right_node.parent_node = node
          this.bst_root.right_node = undefined
        }

        node.parent_node = undefined
        this.bst_root = node
        return node
      }
      this.bst_root.addChild(node)
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
