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
  left?: LeftAnchor
  right?: RightAnchor
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
    return this.left || this.logoot_start
  }
  get true_right(): RightAnchor {
    return this.right || this.logoot_end
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
}

export { AnchorLogootNode, NodeType }
