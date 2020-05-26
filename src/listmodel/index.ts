/**
 * @file This file contains the bulky position manipulation logic for any list-
 * based CRDT (arrays, text, rich text, etc.)
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { DBst } from '../bst'
import { LogootInt } from './int'
import { LogootPosition } from './position'
import {
  AnchorLogootNode,
  sliceNodesIntoRanges,
  NodeType,
  LeftAnchor,
  RightAnchor,
  DocStart,
  DocEnd
} from './logoot'
import { BranchKey, BranchOrder } from './branch'
import { TypeRange, CompareResult, RangeBounds, NumberRange } from '../compare'
import { FatalError, catchBreak, BreakException } from '../utils'

type LdmOptions = {
  /**
   * An option that will run tests on the DBST after every operation to it.
   * **DO NOT** enable in production.
   */
  agressively_test_bst?: boolean
}

/**
 * A Logoot removal.
 */
type Removal = {
  branch: BranchKey
  start: LogootPosition
  length: number
  rclk: LogootInt
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
  left: LogootPosition
  start: LogootPosition
  end: LogootPosition
  right: LogootPosition
}
function constructSkipRanges(
  bst: DBst<AnchorLogootNode>,
  { left, start, end, right }: SkipRangeSearch
): {
  anchor_left: AnchorLogootNode
  nc_left: AnchorLogootNode[]
  skip_ranges: AnchorLogootNode[]
  nc_right: AnchorLogootNode[]
  anchor_right: AnchorLogootNode
} {
  let range
  const cf = (a: AnchorLogootNode, b: AnchorLogootNode): CompareResult =>
    a.preferential_cmp(b)
  range = new TypeRange(
    cf,
    left ? new AnchorLogootNode(left, 0) : undefined,
    right ? new AnchorLogootNode(right, 0) : undefined,
    RangeBounds.LCGO
  )
  const { buckets } = bst.prefSearch(range)

  // Every node that our search returned
  const blob = buckets.lesser
    .map(([node]) => node)
    .concat(buckets.range.map(([node]) => node))
    .concat(buckets.greater.map(([node]) => node))
    .sort((a, b) => a.preferential_cmp(b))

  const [aleft, nc_left, skip_ranges, nc_right, aright] = sliceNodesIntoRanges(
    [left || start, start, end, right || end],
    blob,
    (node: AnchorLogootNode) => bst.add(node)
  )
  // If there's no left/right anchor, the ends of the sliced ranges are the
  // nodes that are not contained in the provided ranges. Normally, this would
  // be the anchor, but since one of the search bounds is undefined, this
  // contains the entire conflict range
  if (!left) {
    nc_left.push(...aleft)
    aleft.length = 0
  }
  if (!right) {
    nc_right.push(...aright)
    aright.length = 0
  }

  if (
    skip_ranges.length === 0 ||
    skip_ranges[skip_ranges.length - 1].logoot_end.lt(end)
  ) {
    const dummy = new AnchorLogootNode(end, 0, NodeType.DUMMY)
    // Search every available array to find an end position
    if (skip_ranges.length) {
      dummy.value = skip_ranges[skip_ranges.length - 1].ldoc_end
    } else if (nc_right.length) {
      dummy.value = nc_right[0].ldoc_start
    } else if (nc_left.length) {
      dummy.value = nc_left[nc_left.length - 1].ldoc_end
    } else if (buckets.lesser.length) {
      dummy.value = buckets.lesser[buckets.lesser.length - 1][0].ldoc_end
    }

    skip_ranges.push(dummy)
  }

  const lowestData = (in_array: AnchorLogootNode[]): AnchorLogootNode => {
    const it = in_array.values()
    while(true) {
      const node = it.next().value
      if (!node || node.type === NodeType.DATA) {
        return node
      }
    }
  }
  let anchor_left = lowestData(aleft.reverse())
  if (!left || (anchor_left && !anchor_left.logoot_end.eq(left))) {
    anchor_left = undefined
  }
  let anchor_right = lowestData(aright)
  if (!right || (anchor_right && !anchor_right.logoot_start.eq(right))) {
    anchor_right = undefined
  }
  return {
    anchor_left,
    nc_left,
    skip_ranges,
    nc_right,
    anchor_right
  }
}

function fillSkipRanges(
  start: LogootPosition,
  clk: LogootInt,
  type: NodeType,
  skip_ranges: AnchorLogootNode[],
  opbuf: OperationBuffer,
  bstadd: (n: AnchorLogootNode) => void
) {
  const level = start.levels
  const start_int = start.l(level)[0].i
  // Everything in `skip_ranges` must be on the same branch at `level`
  // since the space between `start` and `end` is numerically offset
  let last_level_pos = start.l(level)[0].i

  return skip_ranges.flatMap((node, i) => {
    // Insert into empty space
    const space_avail = node
      .logoot_start
      .l(level)[0]
      .copy()
      .sub(last_level_pos)
      .js_int
    let nnode: AnchorLogootNode
    if (space_avail > 0) {
      const nstart = start.copy()
      nstart.l(level)[0].assign(last_level_pos)

      const offset = last_level_pos.copy().sub(start_int)
      nnode = new AnchorLogootNode(
        nstart,
        space_avail,
        type,
        clk.copy()
      )
      nnode.value = node.ldoc_start
      nnode.left_anchor = DocStart
      nnode.right_anchor = DocEnd

      bstadd(nnode)
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

      // If this node is not a `DATA` node, the remove function will ignore
      // a length of zero
      opbuf.remove(node, node.ldoc_start, node.ldoc_length)
      node.type = type
      // A zero-length insertion will also be ignored
      opbuf.insert(node, node.ldoc_start, offset.js_int, node.ldoc_length)
    }

    last_level_pos = node.logoot_end.l(level)[0].i
    return [
      ...nnode ? [nnode] : [],
      ...node.type !== NodeType.DUMMY ? [node] : []
    ]
  })
}

function linkFilledSkipRanges(
  left: LogootPosition,
  right: LogootPosition,
  filled_skip_ranges: AnchorLogootNode[]
): void {
  let last_level_anchor = left
  let last_node_to_anchor: AnchorLogootNode
  const alvl = ((n) => n === Infinity ? 0 : n)(Math.min(
    ...left ? [left.levels] : [],
    ...right ? [right.levels] : []
  ))
  filled_skip_ranges
    .filter((n) => n.logoot_start.levels === alvl && n.type === NodeType.DATA)
    .forEach((node) => {
      if (last_level_anchor && last_level_anchor.levels === alvl) {
        node.reduceLeft(last_level_anchor)
      }
      if (last_node_to_anchor && node.logoot_start.levels === alvl) {
        last_node_to_anchor.reduceRight(node.logoot_start)
      }
      last_level_anchor = node.logoot_end
      last_node_to_anchor = node
    })
  if (last_node_to_anchor && right) {
    last_node_to_anchor.reduceRight(right)
  }
}

function fillRangeConflicts(
  nl_lesser: AnchorLogootNode,
  nl_greater: AnchorLogootNode,
  range: AnchorLogootNode[],
  bstadd: (n: AnchorLogootNode) => void
): void {
  let last: AnchorLogootNode
  const cfupdate = (node: AnchorLogootNode) => {
    if (last && !node.updateNeighborConflicts(last, bstadd)) {
      throw BreakException
    }
    last = node
  }
  last = nl_lesser
  catchBreak(() => range.forEach(cfupdate))
  last = nl_greater
  catchBreak(() => range.reverse().forEach(cfupdate))
}

/**
 * A node that an operation declares knowledge of. Used to distinguish between
 * removals and lack of knowledge.
 */
type KnownNode = {
  type: NodeType,
  start: LogootPosition,
  length: number,
  clk: LogootInt
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

  /**
   * An optional instance of the `ListDocumentModel.Logger` class to log all
   * operations that modify the BST (all calls to `_mergeNode`) to help with
   * bug identification when applicable.
   */
  // debug_logger?: ListDocumentModel.Logger
  
  opts: LdmOptions = {
    agressively_test_bst: false
  }

  constructor(public readonly branch_order: BranchOrder = new BranchOrder()) {}

  insertLogoot(
    br: BranchKey,
    left: LogootPosition,
    right: LogootPosition,
    length: number,
    clk: LogootInt
  ): Operation[] {
    const bstadd = this.opts.agressively_test_bst
      ? (n: AnchorLogootNode) => {
        this.bst.add(n)
        this.bst.selfTest()
      }
      : (n: AnchorLogootNode) => this.bst.add(n)

    const start = new LogootPosition(br, length, left, right, this.branch_order)
    const end = start.offsetLowest(length)

    const {
      anchor_left,
      nc_left,
      nc_right,
      skip_ranges,
      anchor_right
    } = constructSkipRanges(this.bst, {
      left: left,
      start,
      end,
      right: right
    })

    const opbuf = new OperationBuffer(this.bst, this.opts, length)
    if (skip_ranges[skip_ranges.length - 1].type === NodeType.DUMMY) {
      opbuf.dummy_node = skip_ranges[skip_ranges.length - 1]
    }

    const filled_skip_ranges = fillSkipRanges(
      start,
      clk,
      NodeType.DATA,
      skip_ranges,
      opbuf,
      bstadd
    )

    linkFilledSkipRanges(left, right, filled_skip_ranges)

    const nl_lesser = nc_left[nc_left.length - 1] || anchor_left
    const nl_greater = nc_right[0] || anchor_right
    fillRangeConflicts(nl_lesser, nl_greater, filled_skip_ranges, bstadd)

    if (filled_skip_ranges[0]) {
      nc_left.forEach((node) => {
        node.conflict_with.add(filled_skip_ranges[0])
      })
    }
    if (filled_skip_ranges[filled_skip_ranges.length - 1]) {
      nc_right.forEach((node) => {
        node.conflict_with.add(
          filled_skip_ranges[filled_skip_ranges.length - 1]
        )
      })
    }

    // Update the destination anchors. Here, we should reduce the other node's
    // anchor. Remember that 
    if (anchor_left) {
      // Before:
      // | AL |------| OUR NODES |------>
      // After:
      // | AL |----->| OUR NODES |xxxxxxx
      // The problem is that we have to clear conflicts out of the range with
      // xs and `OUR NODES`.
      anchor_left.reduceRight(start)

      // Traverse over nodes and clear out old conflicts
      let node = filled_skip_ranges[0]
      while (node && node.conflict_with.has(anchor_left)) {
        node.conflict_with.delete(anchor_left)
        node = node.inorder_successor
      }
    }
    if (anchor_right) {
      // Before:
      // <---| OUR NODES |-------| AR |
      // After:
      // xxxx| OUR NODES |<------| AR |
      // The problem is that we have to clear conflicts out of the range with
      // xs and `OUR NODES`.
      anchor_right.reduceLeft(end)

      // Traverse over nodes and clear out old conflicts
      let node = filled_skip_ranges[filled_skip_ranges.length - 1]
      while (node && node.conflict_with.has(anchor_right)) {
        node.conflict_with.delete(anchor_right)
        node = node.inorder_predecessor
      }
    }

    return opbuf.operations
  }

  get all_nodes(): AnchorLogootNode[] {
    const nodes: AnchorLogootNode[] = []
    this.bst.operateOnAll((node: AnchorLogootNode) => nodes.push(node))
    return nodes
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
        throw new FatalError(
          `Node has true length of ${node.length}`
        )
      }

      all_nodes.forEach((cfl) => {
        if (cfl === node) {
          return
        }
        if (cfl.logoot_start.lt(node.logoot_start)) {
          // Is to left
          let expected = false
          if (cfl.true_right === DocEnd) {
            expected = true
          } else {
            expected = cfl.true_right.gt(node.logoot_start)
          }
          if (node.conflict_with.has(cfl) !== expected) {
            throw new FatalError(
              `Expected node to ${expected ? 'have' : 'not have'} conflict`
            )
          }
        } else {
          // Is to right
          let expected = false
          if (cfl.true_left === DocStart) {
            expected = true
          } else {
            expected = cfl.true_left.lt(node.logoot_end)
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
  constructSkipRanges,
  fillSkipRanges,
  linkFilledSkipRanges,
  fillRangeConflicts
}
