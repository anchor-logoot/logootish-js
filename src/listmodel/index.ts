/**
 * @file This file contains the bulky position manipulation logic for any list-
 * based CRDT (arrays, text, rich text, etc.)
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */
import 'regenerator-runtime/runtime'

import { DBst } from '../bst'
import { LogootInt } from './int'
import { LogootPosition } from './position'
import {
  AnchorLogootNode,
  sliceNodesIntoRanges,
  NodeType,
  DocStart,
  DocEnd
} from './node'
import { BranchKey, BranchOrder } from './branch'
import { TypeRange, CompareResult, RangeBounds, NumberRange } from '../compare'
import { InternalError, FatalError } from '../utils'

type LdmOptions = {
  /**
   * An option that will run tests on the DBST after every operation to it.
   * **DO NOT** enable in production.
   */
  agressively_test_bst?: boolean
  /**
   * Disables detection of conflicts. Conflicts will still be present, but mark
   * operations will not be performed and the processing overhead will be
   * eliminated.
   */
  disable_conflicts?: boolean
}

/**
 * A Logoot removal.
 */
type Removal = {
  start: LogootPosition
  length: number
  clk: LogootInt
}

type RemovalOperation = {
  type: 'r'
  start: number
  length: number
}
type InsertionOperation = {
  type: 'i'
  start: number
  offset: number
  length: number
}
type MarkOperation = {
  type: 'm'
  start: number
  length: number
  conflicting: boolean
}
/**
 * An operation returned by `_mergeNode` to be run on the local document.
 */
type Operation = RemovalOperation | InsertionOperation | MarkOperation

class OperationBuffer {
  operations: Operation[] = []
  dummy_node?: AnchorLogootNode

  constructor(
    protected readonly bst?: DBst<AnchorLogootNode>,
    protected readonly opts: LdmOptions = {},
    protected readonly length_avail = 0
  ) {}
  remove(node: AnchorLogootNode, start: number, length: number): void {
    if (length === 0) {
      return
    }
    if (start < 0) {
      throw new FatalError(
        'Attempted to perform removal operation with start < 0'
      )
    }
    if (length < 0) {
      throw new FatalError(
        'Attempted to perform removal operation with length < 0'
      )
    }
    this.operations.push({
      type: 'r',
      start,
      length
    })
    if (this.dummy_node && this.dummy_node.ldoc_start >= start) {
      this.dummy_node.value -= length
    }
    const successor = node.inorder_successor
    if (successor) {
      successor.addSpaceBefore(-length, (np) => (this.bst.bst_root = np))
      if (this.bst && this.opts.agressively_test_bst) {
        this.bst.selfTest()
      }
    }
  }
  insert(
    node: AnchorLogootNode,
    start: number,
    offset: number,
    length: number
  ): void {
    if (length === 0) {
      return
    }
    if (start < 0) {
      throw new FatalError(
        'Attempted to perform insertion operation with start < 0'
      )
    }
    if (length < 0) {
      throw new FatalError(
        'Attempted to perform insertion operation with length < 0'
      )
    }
    if (offset + length > this.length_avail) {
      throw new FatalError(
        'Attempted to perform insertion with offset outside available data'
      )
    }
    this.operations.push({
      type: 'i',
      start,
      offset,
      length
    })
    if (this.dummy_node && this.dummy_node.ldoc_start >= start) {
      this.dummy_node.value += length
    }
    const successor = node.inorder_successor
    if (successor) {
      successor.addSpaceBefore(length, (np) => (this.bst.bst_root = np))
      if (this.bst && this.opts.agressively_test_bst) {
        this.bst.selfTest()
      }
    }
  }
}

type SkipRangeSearch = {
  start: LogootPosition
  end: LogootPosition
}
function constructSkipRanges(
  bst: DBst<AnchorLogootNode>,
  { start, end }: SkipRangeSearch,
  bstadd: (n: AnchorLogootNode) => void = (
    n: AnchorLogootNode
  ): AnchorLogootNode => bst.add(n)
): {
  lesser: AnchorLogootNode
  skip_ranges: AnchorLogootNode[]
  greater: AnchorLogootNode
} {
  const cf = (a: AnchorLogootNode, b: AnchorLogootNode): CompareResult =>
    a.preferential_cmp(b)
  const range = new TypeRange(
    cf,
    new AnchorLogootNode(start, 0),
    new AnchorLogootNode(end, 0),
    RangeBounds.LCGO
  )
  const { buckets } = bst.prefSearch(range)

  // Every node that our search returned
  const blob = buckets.lesser
    .map(([node]) => node)
    .concat(buckets.range.map(([node]) => node))
    .concat(buckets.greater.map(([node]) => node))
    .sort((a, b) => a.preferential_cmp(b))

  const [lesser, skip_ranges, greater] = sliceNodesIntoRanges(
    [start, end],
    blob,
    (node: AnchorLogootNode) => bstadd(node)
  )

  if (
    skip_ranges.length === 0 ||
    skip_ranges[skip_ranges.length - 1].logoot_end.lt(end)
  ) {
    const dummy = new AnchorLogootNode(end, 0, NodeType.DUMMY)
    // Search every available array to find an end position
    if (skip_ranges.length) {
      dummy.value = skip_ranges[skip_ranges.length - 1].ldoc_end
    } else if (greater.length) {
      dummy.value = greater[0].ldoc_start
    } else if (lesser.length) {
      dummy.value = lesser[lesser.length - 1].ldoc_end
    }

    skip_ranges.push(dummy)
  }

  return {
    lesser: lesser[lesser.length - 1],
    skip_ranges,
    greater: greater[0]
  }
}

function fillSkipRanges(
  left: LogootPosition,
  right: LogootPosition,
  start: LogootPosition,
  clk: LogootInt,
  type: NodeType,
  skip_ranges: AnchorLogootNode[],
  opbuf: OperationBuffer,
  onnewnode: (n: AnchorLogootNode) => void
): AnchorLogootNode[] {
  const level = start.levels
  const start_int = start.l(level)[0].i
  // Everything in `skip_ranges` must be on the same branch at `level`
  // since the space between `start` and `end` is numerically offset
  let last_level_pos = start.l(level)[0].i

  return skip_ranges.flatMap((node, i) => {
    // Insert into empty space
    const space_avail = node.logoot_start.l(level)[0].copy().sub(last_level_pos)
      .js_int
    let nnode: AnchorLogootNode
    if (space_avail > 0) {
      const nstart = start.copy()
      nstart.l(level)[0].assign(last_level_pos)

      const offset = last_level_pos.copy().sub(start_int)
      nnode = new AnchorLogootNode(nstart, space_avail, type, clk.copy())
      nnode.value = node.ldoc_start
      nnode.left_anchor = offset.eq(0)
      ? left?.copy() || DocStart
      : start.offsetLowest(offset.js_int)
      nnode.right_anchor = node.type === NodeType.DUMMY
        ? right?.copy() || DocEnd
        : start.offsetLowest(space_avail + offset.js_int)

      onnewnode(nnode)
      // If the node is not a data node, the zero-length insertion will be
      // ignored
      opbuf.insert(nnode, nnode.ldoc_start, offset.js_int, nnode.ldoc_length)
    }

    // Insert on top of existing nodes
    if (
      node.type !== NodeType.DUMMY &&
      node.logoot_start.levels === level &&
      node.clk.lteq(clk)
    ) {
      const offset = node.logoot_start.l(level)[0].copy().sub(start_int)
      node.clk = clk.copy()

      node.reduceLeft(
        offset.eq(0)
          ? left?.copy() || DocStart
          : node.logoot_start
      )
      node.reduceRight(
        i === skip_ranges.length - 1
          ? right?.copy() || DocEnd
          : node.logoot_end
      )

      // If this node is not a `DATA` node, the remove function will ignore
      // a length of zero
      opbuf.remove(node, node.ldoc_start, node.ldoc_length)
      node.type = type
      // A zero-length insertion will also be ignored
      opbuf.insert(node, node.ldoc_start, offset.js_int, node.ldoc_length)
    }

    last_level_pos = node.logoot_end.l(level)[0].i
    return [
      ...(nnode ? [nnode] : []),
      ...(node.type !== NodeType.DUMMY ? [node] : [])
    ]
  })
}

function linkFilledSkipRanges(
  left: LogootPosition,
  right: LogootPosition,
  filled_skip_ranges: AnchorLogootNode[],
  level: number
): void {
  // Technically, we specified that all nodes in the skip ranges are linked to
  // each other because they were originally part of the same string. First,
  // update the anchors so that these links are known
  let last_level_anchor = left
  let last_node_to_anchor: AnchorLogootNode
  filled_skip_ranges
    .filter((n) => n.logoot_start.length === level && n.type === NodeType.DATA)
    .forEach((node) => {
      if (last_level_anchor) {
        node.reduceLeft(last_level_anchor)
      }
      if (last_node_to_anchor) {
        last_node_to_anchor.reduceRight(node.logoot_start)
      }
      last_level_anchor = node.logoot_end
      last_node_to_anchor = node
    })
  if (last_node_to_anchor && right) {
    last_node_to_anchor.reduceRight(right)
  }
}

function reduceInferredRangeAnchors(
  lesser: AnchorLogootNode,
  filled_skip_ranges: AnchorLogootNode[],
  greater: AnchorLogootNode
): void {
  const capped_range = [...filled_skip_ranges]
  lesser && capped_range.unshift(lesser)
  greater && capped_range.push(greater)

  // Mutually reduce any nodes that anchor to the new nodes or that these
  // nodes anchor to
  // TODO: Do we actually need to do this for middle nodes?
  // TODO: Will only testing for equality work? (If the answer is yes, then
  // probably no for above)
  capped_range.forEach((node: AnchorLogootNode, i) => {
    const next = capped_range[i + 1]
    if (next) {
      const scan_nodes = new Set<AnchorLogootNode>(next?.conflict_with)
      scan_nodes.add(next)
      scan_nodes.forEach((snode) => {
        const s_left = snode.true_left
        let n_right = node.true_right
        // If `node` is anchored to the newly discovered node OR this node is
        // anchored to `node`...
        if (
          (s_left !== DocStart && s_left.eq(node.logoot_end)) ||
          (n_right !== DocEnd && n_right.eq(snode.logoot_start))
        ) {
          if (
            node.type !== NodeType.REMOVAL ||
            snode.type === NodeType.REMOVAL
          ) {
            snode.reduceLeft(node.logoot_end)
            let ctgt = snode.findLeftAnchorNode(node)
            while (ctgt && ctgt.conflict_with.has(snode)) {
              ctgt.conflict_with.delete(snode)
              ctgt = ctgt.inorder_predecessor
            }
          }
          // Don't reduce to a removal. Removals can be reduced to each other
          if (
            snode.type === NodeType.REMOVAL &&
            node.type !== NodeType.REMOVAL
          ) {
            // If `node` is anchored to a removal, update to anchor to a data
            // node. We only have to do this for `node` and not `snode` since
            // only `node` is new -- `snode` should've already been updated
            if (n_right !== DocEnd && n_right.eq(snode.logoot_start)) {
              let itnode = snode
              // TODO: Take a shortcut using node conflicts instead of iterating
              // This basically follows the chain of anchors until it finds a
              // node that isn't a removal or hits the end
              const nodes_passed_over: AnchorLogootNode[] = []
              while (itnode && itnode.type === NodeType.REMOVAL) {
                node.right_anchor = itnode.right_anchor
                n_right = node.right_anchor

                nodes_passed_over.push(itnode)
                itnode = itnode.findRightAnchorNode()
              }
              
              if (itnode) {
                // Ensure that removals between here and the data node are
                // marked as conflicted
                nodes_passed_over.forEach((n) => n.conflict_with.add(itnode))
                itnode.reduceLeft(node.logoot_end)
              }
            }
          } else {
            node.reduceRight(snode.logoot_start)
            let ctgt = node.findRightAnchorNode(next)
            while (ctgt && ctgt.conflict_with.has(node)) {
              ctgt.conflict_with.delete(node)
              ctgt = ctgt.inorder_successor
            }
          }
        }
      })
    }
  })
}

function fillRangeConflicts(
  nl_lesser: AnchorLogootNode,
  nl_greater: AnchorLogootNode,
  range: AnchorLogootNode[],
  bstadd: (n: AnchorLogootNode) => void
): void {
  let last: AnchorLogootNode
  const cfupdate = (node: AnchorLogootNode): boolean => {
    if (last && !node.updateNeighborConflicts(last, bstadd)) {
      return false
    }
    last = node
    return true
  }
  last = nl_lesser
  range.every(cfupdate)
  last = nl_greater
  range.reverse()
  range.every(cfupdate)
  range.reverse()
}

function insertTrailingConflicts(
  filled_skip_ranges: AnchorLogootNode[],
  bstadd: (n: AnchorLogootNode) => void
): void {
  // Find the first and last nodes from the filled skip ranges
  const first = filled_skip_ranges[0]
  const last = filled_skip_ranges[filled_skip_ranges.length - 1]
  const true_left = first.true_left
  const true_right = first.true_right

  // Add conflicts to lesser nodes
  let node = first.inorder_predecessor
  let expected: boolean
  let getExpectedValue = (): boolean => {
    const pos = true_left !== DocStart && node.positionOf(true_left)
    if (pos && pos < node.length) {
      node = node.splitAround(pos)
      bstadd(node)
    }
    expected = true_left === DocStart ||
      node.logoot_end.gt(true_left) ||
      // Account for nodes with lower level ends:
      node.logoot_end.equalsHigherLevel(true_left)
    return expected
  }
  while(node && node.conflict_with.has(first) !== getExpectedValue()) {
    if (expected) {
      node.conflict_with.add(first)
    } else {
      node.conflict_with.delete(first)
    }
    node = node.inorder_predecessor
  }

  // Add conflicts to greater nodes
  node = last.inorder_successor
  getExpectedValue = (): boolean => {
    const pos = true_right !== DocEnd && node.positionOf(true_right)
    if (pos && pos < node.length) {
      bstadd(node.splitAround(pos))
    }
    expected = true_right === DocEnd || node.logoot_start.lt(true_right)
    return expected
  }
  while(node && node.conflict_with.has(last) !== getExpectedValue()) {
    if (expected) {
      node.conflict_with.add(last)
    } else {
      node.conflict_with.delete(last)
    }
    node = node.inorder_successor
  }
}

function conflictOverNodesInRange(
  last: AnchorLogootNode,
  skip_ranges: AnchorLogootNode[],
  level: number,
  backwards: boolean
): void {
  if (backwards) {
    skip_ranges.reverse()
  }
  skip_ranges.forEach((node) => {
    if (node.logoot_start.length !== level) {
      last = node
      return
    }

    // Scan nodes, always "last" (either lesser or greater depending on
    // the value of `backwards`)
    const scan_nodes = new Set<AnchorLogootNode>(last?.conflict_with)
    last && scan_nodes.add(last)
    
    scan_nodes.forEach((snode) => {
      if (
        !backwards &&
        snode.type === NodeType.DATA &&
        snode.true_right !== DocEnd &&
        snode.true_right.eq(node.logoot_start)
      ) {
        snode.right_anchor = node.true_right
        let cnode = node
        while (
          cnode &&
          (
            snode.right_anchor === DocEnd ||
            cnode.logoot_start.lt(snode.right_anchor)
          )
        ) {
          cnode.conflict_with.add(snode)
          cnode = cnode.inorder_successor
        }
      } else if (
        backwards &&
        snode.type === NodeType.DATA &&
        snode.true_left !== DocStart &&
        snode.true_left.eq(node.logoot_end)
      ) {
        snode.left_anchor = node.true_left
        let cnode = node
        while (
          cnode &&
          (
            snode.left_anchor === DocStart ||
            cnode.logoot_end.gt(snode.left_anchor) ||
            cnode.logoot_end.equalsHigherLevel(snode.left_anchor)
          )
        ) {
          cnode.conflict_with.add(snode)
          cnode = cnode.inorder_predecessor
        }
      }
    })

    last = node
  })
  if (backwards) {
    skip_ranges.reverse()
  }
}

/**
 * A representation of the Logootish Document Model for mapping "real,"
 * continuous `known_position`s to Logoot positions. This is useful when working
 * with strings, arrays, or, just in general, anything that needs a fixed order.
 * This does not actually store the data in question, but stores a mapping of
 * real indices in the data to the Logoot positions of that element. This is
 * used to transform edits between ones in the Logoot and local position spaces.
 * One important thing to note: Logoot edits (insertions/removals) can be
 * applied in any order. Local edits **must** be applied in a consistent order.
 */
class ListDocumentModel {
  /**
   * The BST maps out where all nodes are that are known to this document.
   */
  bst: DBst<AnchorLogootNode> = new DBst()

  max_clk = new LogootInt(0)

  /**
   * An optional instance of the `ListDocumentModel.Logger` class to log all
   * operations that modify the BST (all calls to `_mergeNode`) to help with
   * bug identification when applicable.
   */
  // debug_logger?: ListDocumentModel.Logger

  opts: LdmOptions = {
    agressively_test_bst: false,
    disable_conflicts: false
  }

  constructor(public readonly branch_order: BranchOrder = new BranchOrder()) {}

  insertLocal(
    start: number,
    length: number
  ): {
    left?: LogootPosition
    right?: LogootPosition
    clk: LogootInt
    length: number
  } {
    if (start < 0) {
      throw new TypeError('Passed a start position that is less than zero')
    }
    if (length <= 0) {
      throw new TypeError('Passed a length that is less than or equal to zero')
    }
    // Search:
    // n < start   -> _lesser
    // start <= n  -> _greater
    const { buckets } = this.bst.search(
      new NumberRange(start, start, RangeBounds.LOGO)
    )
    const max_clock = new LogootInt(0)
    buckets.lesser.concat(buckets.greater).forEach(([, node]) => {
      if (node.type === NodeType.DATA) {
        return
      }
      if (node.clk.gteq(max_clock)) {
        max_clock.assign(node.clk).add(1)
      }
    })

    const search = (array: [number, AnchorLogootNode][]): AnchorLogootNode => {
      let data_node: AnchorLogootNode
      array.forEach(([, node]) => {
        if (node.type === NodeType.DATA) {
          if (data_node) {
            // If this is thrown, this means one of two things:
            // 1. There's a BST error that manifests itself as a bad search
            // 2. A DATA node has an `ldoc_length` of zero or less, which should
            // be impossible
            throw new InternalError(
              'Multiple data nodes returned in position search'
            )
          }
          data_node = node
        }
      })
      return data_node
    }
    const lesser_node = search(buckets.lesser)
    if (lesser_node && lesser_node.ldoc_end > start) {
      const pos = lesser_node.logoot_start.offsetLowest(
        start - lesser_node.ldoc_start
      )
      return { left: pos, right: pos, clk: max_clock, length }
    }
    return {
      left: lesser_node?.logoot_end,
      right: search(buckets.greater)?.logoot_start,
      clk: max_clock,
      length
    }
  }

  removeLocal(start: number, length: number): Removal[] {
    const { buckets } = this.bst.search(
      new NumberRange(start, start + length, RangeBounds.LCGO)
    )
    const range = buckets.lesser
      .concat(buckets.range)
      .map(([, node]) => node)
      .filter((node) => node.type === NodeType.DATA)
    const removal_sets: { [key: number]: {start: LogootPosition, length: number}[] } = {}

    const remove = (start: LogootPosition, length: number): void => {
      if (length < 1) {
        return
      }
      if (!removal_sets[start.length]) {
        removal_sets[start.length] = []
      }
      const removals = removal_sets[start.length]
      const last_rm = removals[removals.length - 1]
      if (last_rm && last_rm.start.offsetLowest(last_rm.length).eq(start)) {
        last_rm.length += length
      } else {
        removals.push({ start, length })
      }
    }

    let max_clk = this.max_clk.copy()

    range.forEach((node) => {
      const rm_s = Math.max(start, node.ldoc_start)
      const rm_e = Math.min(start + length, node.ldoc_end)
      const rm_l = rm_e - rm_s
      const rm_o = rm_s - node.ldoc_start

      if (rm_l > 0) {
        // Unlike previous algorithms that I've written, the max clock is
        // always used. This makes it easier for recieving clients to squash
        // nodes since neighboring nodes will be more likely to have the same
        // clock.
        if (node.clk.gteq(max_clk)) {
          max_clk.assign(node.clk.copy().add(1))
        }

        remove(node.logoot_start.offsetLowest(rm_o), rm_l)
      }
    })

    return Object
      .values(removal_sets)
      .flat()
      .map(({ start, length }) => ({ start, length, clk: max_clk }))
  }

  insertLogoot(
    br: BranchKey,
    left: LogootPosition,
    right: LogootPosition,
    length: number,
    clk: LogootInt
  ): Operation[] {
    const bstadd = this.opts.agressively_test_bst
      ? (n: AnchorLogootNode): void => {
          this.bst.add(n)
          this.bst.selfTest()
        }
      : (n: AnchorLogootNode): AnchorLogootNode => this.bst.add(n)

    if (clk.gt(this.max_clk)) {
      this.max_clk.assign(clk)
    }

    const start = new LogootPosition(br, length, left, right, this.branch_order)
    const end = start.offsetLowest(length)

    const { lesser, skip_ranges, greater } = constructSkipRanges(
      this.bst,
      { start, end },
      bstadd
    )

    const opbuf = new OperationBuffer(this.bst, this.opts, length)
    if (skip_ranges[skip_ranges.length - 1].type === NodeType.DUMMY) {
      opbuf.dummy_node = skip_ranges[skip_ranges.length - 1]
    }

    const filled_skip_ranges = fillSkipRanges(
      left,
      right,
      start,
      clk,
      NodeType.DATA,
      skip_ranges,
      opbuf,
      bstadd
    )

    if (!this.opts.disable_conflicts) {
      reduceInferredRangeAnchors(lesser, filled_skip_ranges, greater)
      fillRangeConflicts(lesser, greater, filled_skip_ranges, bstadd)
      insertTrailingConflicts(filled_skip_ranges, bstadd)
    }

    return opbuf.operations
  }

  removeLogoot(
    start: LogootPosition,
    length: number,
    clk: LogootInt
  ): Operation[] {
    const bstadd = this.opts.agressively_test_bst
      ? (n: AnchorLogootNode): void => {
          this.bst.add(n)
          this.bst.selfTest()
        }
      : (n: AnchorLogootNode): AnchorLogootNode => this.bst.add(n)

    if (clk.gt(this.max_clk)) {
      this.max_clk.assign(clk)
    }

    const end = start.offsetLowest(length)

    const { lesser, skip_ranges, greater } = constructSkipRanges(
      this.bst,
      { start, end },
      bstadd
    )

    const opbuf = new OperationBuffer(this.bst, this.opts, length)
    if (skip_ranges[skip_ranges.length - 1].type === NodeType.DUMMY) {
      opbuf.dummy_node = skip_ranges[skip_ranges.length - 1]
    }

    if (!this.opts.disable_conflicts) {
      conflictOverNodesInRange(lesser, skip_ranges, start.length, false)
      conflictOverNodesInRange(greater, skip_ranges, start.length, true)
    }

    // TODO: Fix anchors
    const filled_skip_ranges = fillSkipRanges(
      undefined,
      undefined,
      start,
      clk,
      NodeType.REMOVAL,
      skip_ranges,
      opbuf,
      bstadd
    )

    if (!this.opts.disable_conflicts) {
      reduceInferredRangeAnchors(lesser, filled_skip_ranges, greater)
      fillRangeConflicts(lesser, greater, filled_skip_ranges, bstadd)
      insertTrailingConflicts(filled_skip_ranges, bstadd)
    }

    return opbuf.operations
  }

  get all_nodes(): AnchorLogootNode[] {
    return this.bst.all_nodes
  }
  /**
   * An extremely expensive operation that scans the BSTs for obvious signs of
   * corruption (empty nodes, non-continuous ldoc, out-of-order ldoc, etc.)
   * @throws {FatalError} If any corruption detected
   */
  selfTest(): void {
    this.bst.selfTest()

    const all_nodes = this.all_nodes

    let last_ldoc = 0
    let last_logoot: LogootPosition
    all_nodes.forEach((node) => {
      if (node.ldoc_start !== last_ldoc) {
        throw new FatalError(
          `Position ${node.ldoc_start} found after ${last_ldoc}`
        )
      }
      if (last_logoot && last_logoot.cmp(node.logoot_start) > 0) {
        throw new FatalError(
          `Logoot position ${node.logoot_start} found after ${last_logoot}`
        )
      }
      if (node.length < 1) {
        throw new FatalError(`Node has true length of ${node.length}`)
      }

      all_nodes.forEach((cfl) => {
        if (cfl === node) {
          return
        }
        if (cfl.logoot_start.lt(node.logoot_start)) {
          // Is to left
          let expected = false
          let right = cfl.true_right
          if (right === DocEnd) {
            expected = true
          } else {
            if (right.length > node.logoot_end.length) {
              right = right.copy().truncateTo(node.logoot_start.length)
            }
            expected = right.gt(node.logoot_start)
          }
          if (node.conflict_with.has(cfl) !== expected) {
            throw new FatalError(
              `Expected node to ${expected ? 'have' : 'not have'} conflict`
            )
          }
        } else {
          // Is to right
          let expected = false
          let left = cfl.true_left
          if (left === DocStart) {
            expected = true
          } else {
            if (left.length > node.logoot_end.length) {
              left = left.copy().truncateTo(node.logoot_end.length)
            }
            expected = left.lt(node.logoot_end)
            if (node.logoot_end.equalsHigherLevel(left)) {
              expected = true
            }
          }
          if (node.conflict_with.has(cfl) !== expected) {
            throw new FatalError(
              `Expected node to ${expected ? 'have' : 'not have'} conflict`
            )
          }
        }
      })

      last_ldoc = node.ldoc_end
      last_logoot = node.logoot_start
    })
  }
}

/* namespace ListDocumentModel {
  export type LogOperation = {
    br: BranchKey
    start: LogootPosition
    length: number
    rclk: LogootInt
  }
  export interface Logger {
    log(op: LogOperation): void
    replayAll(
      ldm: ListDocumentModel,
      post?: (ldm: ListDocumentModel) => void
    ): void
  }
  export class JsonableLogger implements Logger {
    ops: LogOperation[] = []
    log(op: LogOperation): void {
      this.ops.push(op)
    }
    replayAll(
      ldm: ListDocumentModel,
      post: (
        ldm: ListDocumentModel,
        logop: LogOperation,
        newops: Operation[]
      ) => void = (): void => undefined
    ): Operation[] {
      let ops: Operation[] = []
      let newops: Operation[]
      this.ops.forEach((o) => {
        newops = ldm._mergeNode(
          o.br,
          o.start,
          o.length,
          o.rclk,
          o.type,
          ldm.canJoin
        )
        ops = ops.concat(newops)
        post(ldm, o, newops)
      })
      return ops
    }

    restoreFromJSON(j: JsonableLogger.JSON[]): JsonableLogger {
      this.ops = j.map((o) => ({
        br: `BR[${o.b.toString(16)}]`,
        start: LogootPosition.fromJSON(o.s),
        length: o.l,
        rclk: LogootInt.fromJSON(o.r),
        type:
          o.t === 'D'
            ? NodeType.DATA
            : o.t === 'R'
            ? NodeType.REMOVAL
            : ((): NodeType => {
                throw new TypeError('Node type was not one of DATA or REMOVAL')
              })()
      }))
      return this
    }
    toJSON(): JsonableLogger.JSON[] {
      const brk_tbl: { [key: string]: number } = {}
      let _brk_i = 0
      const map_brk = (k: BranchKey): number => {
        if (brk_tbl[(k as unknown) as string] === undefined) {
          brk_tbl[(k as unknown) as string] = _brk_i++
        }
        return brk_tbl[(k as unknown) as string]
      }
      return this.ops.map((o) => ({
        b: map_brk(o.br),
        s: o.start.toJSON(),
        l: o.length,
        r: o.rclk.toJSON(),
        t:
          o.type === NodeType.DATA
            ? 'D'
            : NodeType.REMOVAL
            ? 'R'
            : ((): string => {
                throw new TypeError('Node type was not one of DATA or REMOVAL')
              })()
      }))
    }
  }
  export namespace JsonableLogger {
    export type JSON = {
      b: number
      s: LogootPosition.JSON
      l: number
      r: LogootInt.JSON
      t: string
    }
  }
} */

export {
  LogootInt,
  LogootPosition,
  Removal,
  ListDocumentModel,
  OperationBuffer,
  Operation,
  InsertionOperation,
  RemovalOperation,
  MarkOperation,
  constructSkipRanges,
  fillSkipRanges,
  linkFilledSkipRanges,
  fillRangeConflicts
}
