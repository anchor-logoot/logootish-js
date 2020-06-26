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
      if (
        anchor.gt(this.logoot_start) &&
        !this.logoot_start.equalsHigherLevel(anchor)
      ) {
        return
      }
      if (
        this.true_left === DocStart ||
        anchor.gteq(this.true_left) ||
        anchor.equalsHigherLevel(this.true_left)
      ) {
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
      if (
        anchor.lt(this.logoot_end) &&
        !anchor.equalsHigherLevel(this.logoot_end)
      ) {
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

  findLeftAnchorNode(left = this.inorder_predecessor): AnchorLogootNode {
    if (!left) {
      return undefined
    }
    const true_left = this.true_left
    if (true_left === DocStart) {
      return undefined
    }

    const it = new Set<AnchorLogootNode>(left.conflict_with).add(left).values()
    let value: AnchorLogootNode
    while (({ value } = it.next()) && value) {
      if (value.logoot_end.eq(true_left)) {
        return value
      }
    }
    return undefined
  }
  findRightAnchorNode(right = this.inorder_successor): AnchorLogootNode {
    if (!right) {
      return undefined
    }
    const true_right = this.true_right
    if (true_right === DocEnd) {
      return undefined
    }

    const it = new Set<AnchorLogootNode>(right.conflict_with)
      .add(right)
      .values()
    let value: AnchorLogootNode
    while (({ value } = it.next()) && value) {
      if (value.logoot_start.eq(true_right)) {
        return value
      }
    }
    return undefined
  }

  addConflictsFromNode(
    node: AnchorLogootNode
  ): {
    node?: AnchorLogootNode
    added: boolean
  } {
    let nnode: AnchorLogootNode
    let did_add = false

    const tryAdd = (n: AnchorLogootNode, to: AnchorLogootNode = this): void => {
      if (n === to) {
        return
      }
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
      } else if (
        (node.true_left.lt(this.logoot_end) &&
          !node.true_left.equalsHigherLevel(this.logoot_end)) ||
        this.logoot_end.equalsHigherLevel(node.true_left)
      ) {
        // eslint-disable-next-line
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

  positionOf(pos: LogootPosition): number {
    const level = this.logoot_start.length
    if (
      pos.length < level ||
      pos.lt(this.logoot_start) ||
      pos.gt(this.logoot_end)
    ) {
      return undefined
    }
    const lval = pos.l(level - 1)[0].copy()
    lval.sub(this.logoot_start.l(level - 1)[0])
    return lval.js_int
  }
  splitAround(
    pos: number,
    next: IterableIterator<AnchorLogootNode> = this.successorIterator()
  ): AnchorLogootNode {
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
    if (this.type === NodeType.DATA) {
      node.value = this.ldoc_start + pos
    } else {
      node.value = this.ldoc_start
    }
    this.length = pos

    node.conflict_with = new Set<AnchorLogootNode>(this.conflict_with)
    node.right_anchor = this.right_anchor
    delete this.right_anchor
    delete node.left_anchor

    let value: AnchorLogootNode
    let done: boolean
    while (
      ({ value, done } = next.next()) &&
      !done &&
      value.conflict_with.has(this)
    ) {
      value.conflict_with.delete(this)
      value.conflict_with.add(node)
    }

    return node
  }

  toString(short?: boolean): string {
    const type_string = {
      [NodeType.DATA]: 'D',
      [NodeType.DUMMY]: 'X',
      [NodeType.REMOVAL]: 'R'
    }
    const type = type_string[this.type] || '?'
    return (
      `${type} ${this.logoot_start},${this.ldoc_start} + ${this.length} ` +
      `@ ${this.clk} (${this.true_left}<---->${this.true_right})` +
      (this.conflict_with.size === 0 || short
        ? ''
        : ((): string => {
            let str = ' {\n'
            this.conflict_with.forEach(
              (n) => (str += `  ${n.toString(true)}\n`)
            )
            str += '}'
            return str
          })())
    )
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
  const buckets = [
    ...Array(boundaries.length + 1)
  ].map((): AnchorLogootNode[] => [])
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
        if (
          cb &&
          node.logoot_start.length > cb.length &&
          node.logoot_start.copy().truncateTo(cb.length).eq(cb)
        ) {
          return
        }
        bucket.push(node)
        const pos = boundaries[i] && node.positionOf(boundaries[i])
        if (
          boundaries[i] &&
          node.logoot_end.gt(boundaries[i]) &&
          pos &&
          pos > 0 &&
          pos < node.length
        ) {
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
