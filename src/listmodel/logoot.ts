/**
 * @file This contains most of the data types used by the `ListDocumentModel`.
 * While `index.ts` does most of the heavy lifting, this file is the source of
 * most definitions used there. The files were split to make it easier for me to
 * switch since I can switch using tabs in my text editor.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { DBstNode } from '../bst'
import { LogootInt } from './int'
import { CompareResult } from '../utils'
import { LogootPosition } from './position'
import { BranchKey } from './branch'

const DocStart = 'S'
type DocStart = 'S'
const DocEnd = 'E'
type DocEnd = 'E'

type LeftAnchor = DocStart | LogootPosition
type RightAnchor = LogootPosition | DocEnd

enum NodeType {
  DATA,
  REMOVAL,
  // SUGGESTED_REMOVAL,
  DUMMY
}

class AnchorLogootNode extends DBstNode<AnchorLogootNode> {
  left_anchor?: LeftAnchor
  right_anchor?: RightAnchor
  conflict_with: Set<AnchorLogootNode> = new Set<AnchorLogootNode>()
  constructor(
    public logoot_start: LogootPosition,
    public length: number,
    public type = NodeType.DATA,
    public clk = new LogootInt(0)
  ) {
    super()
  }

  get logoot_end(): LogootPosition {
    return this.logoot_start.offsetLowest(this.length)
  }

  get ldoc_start(): number {
    return this.absolute_value
  }
  get ldoc_length(): number {
    return this.type === NodeType.DATA ? this.length : 0
  }
  get ldoc_end(): number {
    return this.ldoc_start + this.ldoc_length
  }

  get true_left(): LeftAnchor {
    return this.left_anchor || this.logoot_start
  }
  get true_right(): RightAnchor {
    return this.right_anchor || this.logoot_end
  }

  reduceLeft(anchor: LeftAnchor): void {
    // If the anchor is the start, our anchor cannot be reduced
    if (anchor && anchor !== DocStart) {
      if (anchor.gt(this.logoot_start)) {
        return
      }
      if (this.true_left === DocStart || anchor.gteq(this.true_left)) {
        if (anchor.eq(this.logoot_start)) {
          delete this.left_anchor
          return
        }
        this.left_anchor = anchor.copy()
      }
    }
  }
  reduceRight(anchor: RightAnchor): void {
    if (anchor && anchor !== DocEnd) {
      if (anchor.lt(this.logoot_end)) {
        return
      }
      if (this.true_right === DocEnd || anchor.lteq(this.true_right)) {
        if (anchor.eq(this.logoot_end)) {
          delete this.right_anchor
          return
        }
        this.right_anchor = anchor.copy()
      }
    }
  }

  addConflictsFromNode(node: AnchorLogootNode): {
    node?: AnchorLogootNode
    added: boolean
  } {
    let nnode: AnchorLogootNode
    let did_add = false

    const tryAdd = (n: AnchorLogootNode, to: AnchorLogootNode = this): void => {
      if (!to.conflict_with.has(n)) {
        did_add = true
        to.conflict_with.add(n)
      }
    }
    if (node.logoot_start.lt(this.logoot_start)) {
      // Left
      if (node.true_right === 'E') {
        tryAdd(node)
      } else if (node.true_right.gt(this.logoot_start)) {
        if (node.true_right.lt(this.logoot_end)) {
          const pos = this.positionOf(node.true_right)
          if (pos > 0 && pos < this.length) {
            nnode = this.splitAround(pos)
          }
        }
        tryAdd(node)
      }
    } else {
      // Right
      if (node.true_left === 'S') {
        tryAdd(node)
      } else if (node.true_left.lt(this.logoot_end)) {
        let cf_node: AnchorLogootNode = this
        if (node.true_left.gt(this.logoot_start)) {
          const pos = this.positionOf(node.true_left)
          if (pos > 0 && pos < this.length) {
            nnode = this.splitAround(pos)
            cf_node = nnode
          }
        }
        tryAdd(node, cf_node)
      }
    }
    return { node: nnode, added: did_add }
  }

  /**
   * Infers a node's conflicts from its neighbors. This assumes that the
   * neighbors have the correct `conflict_with`. This will only add conflicts
   * that the neighbors are in or create.
   * @param neighbor The neighbor to infer conflicts from
   * @param newNode Will be called when a node is split
   */
  updateNeighborConflicts(
    neighbor: AnchorLogootNode,
    newNode: (n: AnchorLogootNode) => void
  ): boolean {
    let did_add = false
    const nodes: AnchorLogootNode[] = [this]

    const all_scan = new Set<AnchorLogootNode>(neighbor.conflict_with)
    all_scan.add(neighbor)

    all_scan.forEach((snode) => {
      const new_nodes: AnchorLogootNode[] = []
      nodes.forEach((dnode) => {
        const { node, added } = dnode.addConflictsFromNode(snode)
        did_add = did_add || added
        if (node) {
          newNode(node)
          new_nodes.push(node)
        }
      })
      nodes.push(...new_nodes)
    })
    return did_add
  }

  preferential_cmp(other: AnchorLogootNode): CompareResult {
    return this.logoot_start.cmp(other.logoot_start)
  }

  lengthOnLevel(level: number): number {
    if (level > this.logoot_start.length) {
      return Infinity
    } else if (level < this.logoot_start.length) {
      return 0
    } else {
      return this.length
    }
  }
  positionOf(pos: LogootPosition): number {
    const level = this.logoot_start.length
    if (pos.length < level) {
      return undefined
    }
    const lval = pos.l(level - 1)[0].copy()
    lval.sub(this.logoot_start.l(level - 1)[0])
    return lval.js_int
  }
  splitAround(pos: number): AnchorLogootNode {
    if (this.length < 2) {
      throw new TypeError('This node cannot be split. It is too small.')
    }
    if (pos < 1 || pos >= this.length) {
      throw new TypeError('The split position is not in the node.')
    }
    const node = new AnchorLogootNode(
      this.logoot_start.offsetLowest(pos),
      this.length - pos,
      this.type,
      this.clk.copy()
    )
    node.value = this.ldoc_start + pos
    this.length = pos
    return node
  }

  toString(): string {
    return `${this.logoot_start} + ${this.length} @ ${this.clk}`
  }
}

function sliceNodesIntoRanges(
  boundaries: LogootPosition[],
  nodes: AnchorLogootNode[],
  onNewNode: (node: AnchorLogootNode) => void
): AnchorLogootNode[][] {
  if (boundaries.some((b) => !b)) {
    throw new TypeError('Boundaries must be defined')
  }
  const buckets = Array
    .apply(null, Array(boundaries.length + 1))
    .map((): AnchorLogootNode[] => [])
  nodes = nodes.sort((a, b) => a.preferential_cmp(b))

  nodes.forEach((node) => {
    buckets.forEach((bucket: AnchorLogootNode[], i: number) => {
      const cb = boundaries[i]
      if (node && (!cb || node.logoot_start.lt(cb))) {
        // Since the boundary is considered the right end of a node, the next
        // bucket will include any nodes with a position on a lower level:
        //                   [1]
        // | buckets[i] |-----------| buckets[i+1] |
        //              [1,0]   [1,1]
        //               ---|node|---
        if (cb && node.logoot_start.copy().truncateTo(cb.length).eq(cb)) {
          return
        }
        bucket.push(node)
        if (boundaries[i] && node.logoot_end.gt(boundaries[i])) {
          node = node.splitAround(node.positionOf(boundaries[i]))
          onNewNode(node)
        } else {
          node = undefined
        }
      }
    })
  })

  return buckets
}

export {
  AnchorLogootNode,
  sliceNodesIntoRanges,
  NodeType,
  DocStart,
  DocEnd,
  LeftAnchor,
  RightAnchor
}
