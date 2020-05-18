/**
 * @file A binary search tree implementation for finding ranges within the tree
 * and finding neighboring nodes. The documentation for this is, erm, not super
 * amazing.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */
import 'regenerator-runtime/runtime'

import { DualCompareFunction, MemberPtr, CompareResult } from './utils'
import { TypeRange, NumberRange } from './compare'

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

/**
 * A single point in a `RangeSearch`. The first element is the point value, the
 * second element is a boolean that is true if the point is inclusive, and the
 * third element the bucket string, or `undefined` to drop elements.
 */
type Point<T> = [T, boolean, string?]

/**
 * A representation of an inequality that can be used to search and sort the
 * elements of an array into `bucket`s. It is a collection of `Point`s. Each
 * `Point` will include any values less that its own and, if the point is
 * inclusive, equal to its own.
 */
class RangeSearch<T> {
  /**
   * True if only **one** value is kept for elements before the first point.
   * Used to find the inorder predecessor.
   */
  lesser_find_greatest = false
  /**
   * True if only **one** value is kept for elements after the last point. Used
   * to find the inorder successor.
   */
  greater_find_least = false
  private points: Point<T>[] = []
  private last_bucket?: string
  private cf: DualCompareFunction<T>

  constructor(cf: DualCompareFunction<T>) {
    this.cf = cf
  }

  static lteq<T>(
    cf: DualCompareFunction<T>,
    pd: T,
    bucket: string
  ): RangeSearch<T> {
    const search = new RangeSearch<T>(cf)
    search.points.push([pd, true, bucket])
    search.last_bucket = undefined
    return search
  }
  static lt<T>(
    cf: DualCompareFunction<T>,
    pd: T,
    bucket: string
  ): RangeSearch<T> {
    const search = new RangeSearch<T>(cf)
    search.points.push([pd, false, bucket])
    search.last_bucket = undefined
    return search
  }
  static gteq<T>(
    cf: DualCompareFunction<T>,
    pd: T,
    bucket: string
  ): RangeSearch<T> {
    const search = new RangeSearch<T>(cf)
    search.points.push([pd, false, undefined])
    search.last_bucket = bucket
    return search
  }
  static gt<T>(
    cf: DualCompareFunction<T>,
    pd: T,
    bucket: string
  ): RangeSearch<T> {
    const search = new RangeSearch<T>(cf)
    search.points.push([pd, true, undefined])
    search.last_bucket = bucket
    return search
  }

  /**
   * Add a point to the collection.
   * @param data - The value for comparison.
   * @param bucket - The `bucket` to sort values into, or undefined to discard.
   * @param inclusive - Determines if the point includes `data`.
   */
  push_point(data: T, bucket: string, inclusive = false): void {
    const point: Point<T> = [data, inclusive, bucket]
    for (let i = 0; i < this.points.length; i++) {
      if (this.cf(data, this.points[i][0]) < 0) {
        this.points.splice(i, 0, point)
        return
      }
    }
    this.points.push(point)
  }
  /**
   * Set the default bucket for any values greater than the last point.
   */
  all_greater(bucket?: string): void {
    this.last_bucket = bucket
  }

  /**
   * A function used by Binary Search Trees to determine traversal.
   * @param data - The value to compare.
   * @param current - The current values that are stored.
   * @param clear_buckets - If true, elements from `current` will be eliminated
   * if they are affected by `lesser_find_greatest` or `greater_find_least` and
   * an alternative closer to `data` is found.
   * @param traverse_left - Will be called when there is the possibility that
   * there are elements smaller than this one that will satisfy
   * `greater_find_least`, thereby reducing the number of necessary traversals.
   * @returns An object containing `left` and `right`, which are booleans that
   * tell whether more data could be found to the left and right of `data`,
   * respectively, as well as an optional `bucket` string to tell where `data`
   * should be sorted.
   */
  getBucketInfo(
    data: T,
    current?: { [key: string]: T[] },
    clear_buckets = false,
    traverse_left?: () => void
  ): {
    left: boolean
    right: boolean
    bucket?: string
  } {
    let left = false
    let passed_bucket = false
    let bucket = this.last_bucket
    let right = Boolean(this.last_bucket)

    // Account for empty searches
    if (!this.points.length && this.last_bucket) {
      if (!left && traverse_left) {
        traverse_left()
      }
      left = true
    }

    // Calculate the membership of each range before the point
    for (let i = 0; i < this.points.length; i++) {
      const [other, inclusive, b] = this.points[i]

      if (b && !passed_bucket) {
        if (!left && traverse_left) {
          traverse_left()
        }
        left = true
      }

      // Should we add to this current bucket?
      if (this.cf(data, other) < (inclusive ? 1 : 0)) {
        if (!passed_bucket) {
          passed_bucket = true
          bucket = b
        }
        if (
          i == 0 &&
          this.lesser_find_greatest &&
          clear_buckets &&
          current[b] &&
          current[b].length
        ) {
          if (this.cf(current[b][0], data) < 0) {
            current[b] = []
          } else if (this.cf(current[b][0], data) > 0) {
            bucket = undefined
          }
        }
      }

      if (b && passed_bucket && this.cf(other, data) !== 0) {
        right = true
      }
    }

    // Ensure we account for the area after the last point
    if (!passed_bucket && this.last_bucket) {
      const b = this.last_bucket
      // Traverse the left side assuming we haven't already
      if (bucket && !left) {
        left = true
        traverse_left()
      }
      if (
        this.greater_find_least &&
        clear_buckets &&
        current[b] &&
        current[b].length
      ) {
        if (this.cf(current[b][0], data) > 0) {
          current[b] = []
        } else if (this.cf(current[b][0], data) < 0) {
          bucket = undefined
        }
      }
      right = true
    }

    // Don't traverse if unnecessary
    left =
      left &&
      (!this.lesser_find_greatest ||
        !this.points.length ||
        !current[this.points[0][2]] ||
        !current[this.points[0][2]].length ||
        this.cf(current[this.points[0][2]][0], data) <= 0)
    right =
      right &&
      (!this.greater_find_least ||
        !current[this.last_bucket] ||
        !current[this.last_bucket].length ||
        this.cf(current[this.last_bucket][0], data) >= 0)

    return { left, bucket, right }
  }

  /*
   * Place `data` into a bucket defined by `range_buckets` based on the points
   * that have been added to this search
   * @param data - The value to sort.
   * @param range_buckets - Sort `data` into one of the buckets defined as
   * properties on this object. An array will be assigned at the bucket name if
   * the target bucket is not already defined.
   * @returns `range_buckets`
   */
  sort(
    data: T,
    range_buckets: { [key: string]: T[] } = {}
  ): { [key: string]: T[] } {
    let i
    for (i = 0; i < this.points.length; i++) {
      const [other, inclusive, b] = this.points[i]

      if (this.cf(data, other) < (inclusive ? 1 : 0)) {
        if (!b) {
          return range_buckets
        }
        if (
          !range_buckets[b] ||
          (i === 0 &&
            this.lesser_find_greatest &&
            range_buckets[b].length &&
            this.cf(range_buckets[b][0], data) < 0)
        ) {
          range_buckets[b] = []
        }
        range_buckets[b].push(data)
        return range_buckets
      }
    }
    i = this.points.length

    const b = this.last_bucket
    if (!b) {
      return range_buckets
    }
    if (
      !range_buckets[b] ||
      (this.greater_find_least &&
        range_buckets[b].length &&
        this.cf(range_buckets[b][0], data) > 0)
    ) {
      range_buckets[b] = []
    }
    range_buckets[b].push(data)
    return range_buckets
  }

  /*
   * Sort the elements of `array` into buckets and return the result.
   * @param array - The array to sort.
   * @returns The populated buckets.
   */
  search_array(array: T[]): { [key: string]: T[] } {
    const range_buckets: { [key: string]: T[] } = {}
    array.forEach((el) => this.sort(el, range_buckets))
    return range_buckets
  }
}

const noRootUpdateFunction = (): void => {
  throw new TypeError(
    'No root update function was provided, but a root update was attempted'
  )
}

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

  /*
   * Creates a range search from the local compare function.
   * @returns A new range search.
   */
  create_range_search(): RangeSearch<S> {
    return new RangeSearch<S>(this.cmp)
  }

  /*
   * Efficiently search the BST and sort the applicable nodes into buckets.
   * @param search - The `RangeSearch` to do
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   * @param map - The object to assign buckets to. It is returned.
   * @returns An object with type `T` sorted into buckets.
   */
  search(
    search: RangeSearch<S>,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root'),
    map: { [key: string]: T[] } = {}
  ): { [key: string]: T[] } {
    if (!node.value) {
      return map
    }
    const { bucket, right } = search.getBucketInfo(
      node.value.data,
      map,
      true,
      () => {
        // Interrupting the sorting into buckets to search the left side of the
        // tree allows us to look for elements that *might* be smaller, so we
        // can avoid needlessly searching the right side of the tree
        this.search(search, new MemberPtr(node.value, 'left'), map)
      }
    )
    if (bucket) {
      if (!map[bucket]) {
        map[bucket] = []
      }
      map[bucket].push(node.value.data)
    }
    if (right) {
      this.search(search, new MemberPtr(node.value, 'right'), map)
    }
    return map
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
        if (node.value.data !== object) {
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
   * @param filter - An optional function that has the final say in whether a
   * node is removed. While an `object` is provided for quick tree traversal, it
   * is not always desirable to remove *every* node with that particular value.
   * This function allows the user to override that behavior.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  remove(
    object: S,
    filter: (data: T) => boolean = (): boolean => true,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      const result = this.cmp(node.value.data, object)
      const should_remove = filter(node.value.data)
      if (result > 0) {
        this.remove(object, filter, new MemberPtr(node.value, 'left'))
      } else if (result < 0) {
        this.remove(object, filter, new MemberPtr(node.value, 'right'))
      } else {
        this.remove(object, filter, new MemberPtr(node.value, 'left'))
        this.remove(object, filter, new MemberPtr(node.value, 'right'))
      }
      if (result === 0 && should_remove) {
        if (node.value.left && node.value.right) {
          const successor = this._getInorderSuccessor(node.value.data, node)

          this.remove(successor.data, undefined, successor.ptr)
          node.value.data = successor.data
        } else {
          node.value = node.value.left || node.value.right
        }
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
   * @param sequential - If true, `operation` will be called sequentially. If
   * false, `operation` will be called for the root node first, then children.
   * @param operation - The function to run on each node.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  operateOnAllGteq(
    value: S,
    operation: NodeOp<T>,
    sequential = true,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (this.gteqcmp(node.value.data, value)) {
        if (!sequential) {
          operation(node.value)
        }
        this.operateOnAllGteq(
          value,
          operation,
          sequential,
          new MemberPtr(node.value, 'left')
        )
        if (sequential) {
          operation(node.value)
        }
      }
      this.operateOnAllGteq(
        value,
        operation,
        sequential,
        new MemberPtr(node.value, 'right')
      )
    }
  }
  /**
   * Perform an operation on all of the elements less than or equal to a
   * search type or object.
   * @param value - The search type or object at which to end a search.
   * @param sequential - If true, `operation` will be called sequentially. If
   * false, `operation` will be called for the root node first, then children.
   * @param operation - The function to run on each node.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  operateOnAllLteq(
    value: S,
    operation: NodeOp<T>,
    sequential = true,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (this.gteqcmp(value, node.value.data)) {
        if (!sequential) {
          operation(node.value)
        }
        this.operateOnAllLteq(
          value,
          operation,
          sequential,
          new MemberPtr(node.value, 'left')
        )
        if (sequential) {
          operation(node.value)
        }
        this.operateOnAllLteq(
          value,
          operation,
          sequential,
          new MemberPtr(node.value, 'right')
        )
      } else {
        this.operateOnAllLteq(
          value,
          operation,
          sequential,
          new MemberPtr(node.value, 'left')
        )
      }
    }
  }

  /**
   * Perform an operation on all nodes.
   * @param operation - The function to run on each node.
   * @param sequential - If true, `operation` will be called sequentially. If
   * false, `operation` will be called for the root node first, then children.
   * @param node - The node in the tree where the search can be started. It's
   * optional and does not need to be changed for nearly all use cases.
   */
  operateOnAll(
    operation: NodeOp<T>,
    sequential = true,
    node: BstNodePtr<T> = new MemberPtr(this, 'bst_root')
  ): void {
    if (node.value) {
      if (!sequential) {
        operation(node.value)
      }
      this.operateOnAll(
        operation,
        sequential,
        new MemberPtr(node.value, 'left')
      )
      if (sequential) {
        operation(node.value)
      }
      this.operateOnAll(
        operation,
        sequential,
        new MemberPtr(node.value, 'right')
      )
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
      str += '  ' + data.toString().split('\n').join('\n  ') + '\n'
    })
    str += ']'
    return str
  }
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
          node.right_node = this.right_node
          node.value = this.value

          if (node.right_node) {
            node.right_node.parent_node = node
          }
          delete this.right_node
          node.addChild((this as unknown) as T)
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

  operateOnAll(cb: (data: T) => void): void {
    if (this.left_node) {
      this.left_node.operateOnAll(cb)
    }
    cb((this as unknown) as T)
    if (this.right_node) {
      this.right_node.operateOnAll(cb)
    }
  }

  selfTest(
    parent?: T,
    is_left?: boolean,
    mnv: number = 0,
    mxv: number = 0,
    known: DBstNode<T>[] = [],
    can_have_equal: boolean = false
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
      throw new Error('Node has wrong position for location')
    } else if (is_left === false && this.value <= 0) {
      throw new Error('Node has wrong position for location')
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
        known
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
  search(range: NumberRange): TypeRangeSearch<number, T> {
    const search = new TypeRangeSearch<number, T>(range)
    if (this.bst_root) {
      this.bst_root.search(search, 0)
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

  selfTest(): void {
    if (this.bst_root) {
      this.bst_root.selfTest(undefined, undefined, -Infinity, Infinity)
    }
  }
}

export { Bst, RangeSearch, BstNode, DBst, DBstNode }
