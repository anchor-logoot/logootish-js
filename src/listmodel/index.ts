/**
 * @file This file contains the bulky position manipulation logic for any list-
 * based CRDT (arrays, text, rich text, etc.)
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { DBst } from '../bst'
import { LogootInt } from './int'
import { LogootPosition } from './position'
import { AnchorLogootNode, NodeType } from './logoot'
import { BranchKey, BranchOrder } from './branch'
import { TypeRange, CompareResult, RangeBounds } from '../compare'

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
  nc_left: AnchorLogootNode[]
  skip_ranges: AnchorLogootNode[]
  nc_right: AnchorLogootNode[]
} {
  const nc_left: AnchorLogootNode[] = []
  const skip_ranges: AnchorLogootNode[] = []
  const nc_right: AnchorLogootNode[] = []

  const { buckets } = bst.prefSearch(
    new TypeRange(
      (a, b): CompareResult => a.preferential_cmp(b),
      new AnchorLogootNode(left, 0),
      new AnchorLogootNode(right, 0),
      RangeBounds.LCGC
    )
  )

  let blob = buckets.range
    .map(([node]) => node)
    .sort((a, b) => a.preferential_cmp(b))
  const lesser = buckets.lesser
    .map(([node]) => node)
    .sort((a, b) => b.preferential_cmp(a))[0]
  
  if (lesser && lesser.logoot_end.cmp(start) > 0) {
    blob.unshift(lesser)
  }

  // blob = blob.filter((node) => node.lengthOnLevel(left.length) !== Infinity)
  blob.forEach((node) => {
    const splitOffToRight = (node: AnchorLogootNode): AnchorLogootNode => {
      const nnode = node.splitAround(node.positionOf(end))
      bst.add(nnode)
      nc_right.unshift(nnode)
      return nnode
    }
    const splitOffToRanges = (node: AnchorLogootNode): AnchorLogootNode => {
      // The `positionOf` function will always be defined because `start`
      // cannot possibly have less levels if the node start is less and the
      // node end is greater.
      const nnode = node.splitAround(node.positionOf(start))
      bst.add(nnode)
      if (node.logoot_start.length !== start.length) {
        // Must be on a higher level; We're in the middle of it
        // NNNNNNNNN|NNNNN (where N is node, and | is start<->end)
        nc_right.unshift(nnode)
      } else {
        skip_ranges.unshift(nnode)
        if (nnode.logoot_end.cmp(end) > 0) {
          splitOffToRight(nnode)
        }
      }
      return nnode
    }

    if (node.logoot_start.cmp(start) < 0) {
      nc_left.push(node)
      // If the node overhangs the boundary, split it
      if (node.logoot_end.cmp(start) > 0) {
        splitOffToRanges(node)
      }
    } else if (node.logoot_start.cmp(end) < 0) {
      skip_ranges.push(node)
      if (node.logoot_end.cmp(end) > 0) {
        splitOffToRight(node)
      }
    } else {
      nc_right.push(node)
    }
  })

  if (
    skip_ranges.length === 0 ||
    skip_ranges[skip_ranges.length - 1].logoot_end.cmp(end) < 0
  ) {
    const dummy = new AnchorLogootNode(end, 0, NodeType.DUMMY)
    if (skip_ranges.length) {
      dummy.value = skip_ranges[skip_ranges.length - 1].ldoc_end
    } else if (nc_right.length) {
      dummy.value = nc_right[0].ldoc_start
    } else if (buckets.lesser.length) {
      dummy.value = buckets.lesser[buckets.lesser.length - 1][0].ldoc_end
    }

    skip_ranges.push(dummy)
  }

  return { nc_left, skip_ranges, nc_right }
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
  /**
   * An option that will run tests on the DBST after every operation to it.
   * **DO NOT** enable in production.
   */
  agressively_test_bst = false

  constructor(public readonly branch_order: BranchOrder = new BranchOrder()) {}

  _mergeNode(
    br: BranchKey,
    left: LogootPosition,
    right: LogootPosition,
    length: number
  ): Operation[] {
    const start = new LogootPosition(br, length, left, right, this.branch_order)
    const end = start.offsetLowest(length)

    const { nc_left, nc_right, skip_ranges } = constructSkipRanges(this.bst, {
      left,
      start,
      end,
      right
    })

    const ops: Operation[] = []
    return ops
  }

  /**
   * An extremely expensive operation that scans the BSTs for obvious signs of
   * corruption (empty CGs, non-continuous ldoc, out-of-order ldoc, etc.)
   * @throws {FatalError} If any corruption detected
   */
  selfTest(): void {
    this.bst.selfTest()
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
  constructSkipRanges
}
