import { Int32 } from '../ints'
import { CompareResult } from '../utils'

// What a C++ typedef would do
// This makes it possible to completely swap out the type of the int used in the
// algorithm w/o actually replacing each instance (which would be a real pain)
import LogootInt = Int32

function all_keys(obj: any): (symbol | number | string)[] {
  return (Object.keys(obj) as (symbol | number | string)[]).concat(
    Object.getOwnPropertySymbols(obj)
  )
}

/**
 * A position in Logoot. This is just an array of numbers with some utility
 * functions. In Logoot, it must always be possible to allocate a position
 * between any possible two positions. In this algorithm, a position with more
 * `levels` (or elements in the array) comes first. So, if it is necessary to
 * create a position between `A` and `B`, then another level can be added to the
 * position to make it come after `A` and before `B`. Positions are represented
 * in writing the same as arrays: `[1,2,3]`
 * @example ```typescript
 * const a = new LogootPosition()
 * console.log(a.toString()) // [0]
 *
 * const b = a.offsetLowest(1)
 * console.log(b.toString()) // [1]
 *
 * console.log(new LogootPosition(1, a, b).toString()) // [0]
 * console.log(new LogootPosition(2, a, b).toString()) // [0,0]
 * ```
 */
class LogootPosition {
  protected array: LogootInt[] = [new LogootInt(0)]

  /**
   * This constructor constructs a new position that is in the range specified
   * by `start` and `end`. By using `len`, it is possible to enforce that a
   * certain number of additional positions are available in the selected range.
   * This guarantees that there's space for a LogootNode of length `len` at this
   * position between `start` and `end`.
   *
   * @param len - The length of the allocation to make. The length is never
   * actually stored in the Logoot position, but is used when finding space for
   * the position to be created and `len` position(s) after it.
   * @param start - This will cause the new position to have a value greater
   * than or equal to this. This value is tricky: It must be the end of the last
   * node. So if `A` is at `[1]` and an allocation *after* it is desired, then
   * `[2]` would need to be passed to `start`.
   * @param end - This will cause the new position to have a value less than or
   * equal to this, subject to the value of `len`.
   */
  constructor(
    len = 0,
    readonly start?: LogootPosition,
    readonly end?: LogootPosition
  ) {
    if (!start && end) {
      this.array = end.inverseOffsetLowest(len).array
    } else if (!end && start) {
      this.array = start.copy().array
    } else if (start && end) {
      let done = false
      const itstart = start.array.values()
      const itend = end.array.values()
      let nstart
      let nend

      this.array.length = 0

      while (!done) {
        if (!nstart || !nstart.done) {
          nstart = itstart.next()
        }
        if (!nend || !nend.done) {
          nend = itend.next()
        }

        if (!nstart.done && !nend.done) {
          // See if we have enough space to insert 'len' between the nodes
          if (nend.value.gteq(new LogootInt(nstart.value).add(len))) {
            // There's space. We're done now: At the shallowest possible level
            done = true
          }
          // Regardless, the start ID is the new ID for this level of our node
          this.array.push(new LogootInt(nstart.value))
        } else if (!nstart.done) {
          // So there's no end restriction, that means we can just add right on
          // top of the old end (the start of the new node)
          this.array.push(new LogootInt(nstart.value))
          done = true
        } else if (!nend.done) {
          // We have an end restriction, but no start restriction, so we just
          // put the new node's start behind the old end
          this.array.push(new LogootInt(nend.value).sub(len))
          done = true
        } else {
          // So both other IDs have nothing else. It must be time to make a new
          // level and be done
          this.array.push(new LogootInt())
          done = true
        }
      }
    }
  }

  static fromJSON(eventnode: LogootPosition.JSON): LogootPosition {
    const pos = new LogootPosition()
    pos.array.length = 0
    eventnode.forEach((n) => {
      pos.array.push(LogootInt.fromJSON(n))
    })
    return pos
  }
  toJSON(): LogootPosition.JSON {
    return this.array.map((n) => n.toJSON())
  }

  /**
   * @returns Internal array length
   */
  get length(): number {
    // A zero-length position is NOT valid
    // Through some sneakiness, you COULD directly assign the array to make it
    // have a length of zero. Don't do it.
    return this.array.length
  }
  /**
   * Returns the last index of the array. This is useful because before this,
   * the algorithm code often contained many occurences of `length - 1`. This
   * is used to cut down redundancy.
   */
  get levels(): number {
    // A zero-length position is NOT valid
    // Through some sneakiness, you COULD directly assign the array to make it
    // have a length of zero. Don't do it.
    return this.length - 1
  }
  /**
   * An array accessor
   */
  level(n: number): LogootInt {
    return this.array[n]
  }
  /**
   * An array accessor
   * @alias level
   */
  l(n: number): LogootInt {
    return this.level(n)
  }

  /**
   * Returns a new position with `offset` added to the lowest level of the
   * position.
   */
  offsetLowest(offset: number | LogootInt): LogootPosition {
    return Object.assign(new LogootPosition(), {
      array: this.array.map((current, i, array) => {
        return i < array.length - 1
          ? current
          : new LogootInt(current).add(offset)
      })
    })
  }
  /**
   * Returns a new position with `offset` subtracted from the lowest level of
   * the position.
   */
  inverseOffsetLowest(offset: number | LogootInt): LogootPosition {
    return Object.assign(new LogootPosition(), {
      array: this.array.map((current, i, array) => {
        return i < array.length - 1
          ? current
          : new LogootInt(current).sub(offset)
      })
    })
  }

  /**
   * Duplicates this position.
   */
  copy(): LogootPosition {
    return Object.assign(new LogootPosition(), {
      array: this.array.map((e) => new LogootInt(e))
    })
  }

  /**
   * Return a copy of this position, but with the number of levels specified by
   * `level`. If this position has fewer levels, zeroes will be added in place.
   */
  equivalentPositionAtLevel(level: number): LogootPosition {
    return Object.assign(new LogootPosition(), {
      array: new Array(level + 1).fill(0, 0, level + 1).map((el, i) => {
        return new LogootInt(this.array[i])
      })
    })
  }

  cmp(pos: LogootPosition, level = 0): CompareResult {
    if (level >= this.length) {
      if (this.length === pos.length) {
        return 0
      }
      return 1
    }
    if (level >= pos.length) {
      return -1
    }
    switch (this.level(level).cmp(pos.level(level))) {
      case 1:
        return 1
      case -1:
        return -1
      case 0:
        return this.cmp(pos, level + 1)
      default:
        return 0
    }
  }

  /**
   * Return this position if it is between `min` or `max`, otherwise return
   * `min` if this is less and `max` if this is greater.
   * @param min - The minimum output.
   * @param max - The maximum output.
   * @param preserve_levels - If defined, the output number of levels will be
   * equal to `preserve_levels`.
   */
  clamp(
    min: LogootPosition,
    max: LogootPosition,
    preserve_levels?: undefined | number
  ): LogootPosition {
    const clamped = this.cmp(min) < 0 ? min : this.cmp(max) > 0 ? max : this
    if (preserve_levels !== undefined) {
      return clamped.equivalentPositionAtLevel(preserve_levels)
    } else {
      return clamped.copy()
    }
  }

  toString(): string {
    let str = '['
    this.array.forEach((el, i, a) => {
      str += el.toString() + (i >= a.length - 1 ? '' : ',')
    })
    str += ']'
    return str
  }
}
namespace LogootPosition {
  export type JSON = LogootInt.JSON[]
  export namespace JSON {
    export const Schema = { type: 'array', items: LogootInt.JSON.Schema }
  }
}

type BranchKey = symbol | string | number
/**
 * Logoot treats each atom as seperate. However, in a real-world environment, it
 * is not practical to treat each atom seperately. To save memory and CPU time,
 * the algorithm groups together consecutive atoms into `LogootNode`s. A
 * `LogootNode` is technically just a series of consecutive atoms with the same
 * `rclk` (vector clock).
 */
abstract class LogootNode {
  rclk: LogootInt = new LogootInt(0)
  group: LogootNodeGroup
  branch: BranchKey
  merged_into: { [key: string]: { at_rclk: LogootInt } }

  /**
   * @param node - A node to copy, C++ style
   */
  constructor(
    node: LogootNode | { group: LogootNodeGroup; branch: BranchKey },
    update_group = true
  ) {
    if (node instanceof LogootNode) {
      Object.assign(this, node.copy())
    } else {
      this.group = node.group
      this.branch = node.branch
      // Ensure that the group's node lookup properly reflects this node's state
      if (update_group) {
        this.group.br(this.branch, this)
      }
    }
  }

  abstract copy(): LogootNode

  /**
   * Legacy support to grab the start from the node group.
   */
  get start(): LogootPosition {
    return this.group.start
  }
  /**
   * Legacy support to grab the length from the node group.
   */
  get length(): number {
    return this.group.length
  }

  /**
   * Legacy support to grab the end from the node group.
   */
  get end(): LogootPosition {
    return this.group.end
  }

  get br_merged_into(): { at_rclk: LogootInt; branch: BranchKey }[] {
    return all_keys(this.merged_into).map((k) => {
      const { at_rclk } = this.m(k)
      return { at_rclk, branch: k }
    })
  }
  m(key: BranchKey, val?: { at_rclk: LogootInt }): { at_rclk: LogootInt } {
    if (val) {
      this.merged_into[(key as unknown) as string] = val
    }
    return this.merged_into[(key as unknown) as string]
  }

  abstract toString(): string
}
class DataLogootNode extends LogootNode {
  /**
   * The position of the node in the local document.
   */
  known_position = 0
  /**
   * The end of the node in the local document.
   */
  get known_end_position(): number {
    return this.known_position + this.length
  }

  copy(): DataLogootNode {
    const node = new DataLogootNode(
      { group: this.group, branch: this.branch },
      false
    )
    node.rclk = new LogootInt(this.rclk)
    node.known_position = this.known_position
    all_keys(this.merged_into).forEach((k) => {
      node.m(k, { at_rclk: new LogootInt(this.m(k).at_rclk) })
    })
    return node
  }

  toString(): string {
    return (
      'DATA' +
      this.start.toString() +
      `(${this.known_position}) + ${this.length} @ ${this.rclk}`
    )
  }
}
class RemovalLogootNode extends LogootNode {
  copy(): RemovalLogootNode {
    const node = new RemovalLogootNode(
      { group: this.group, branch: this.branch },
      false
    )
    node.rclk = new LogootInt(this.rclk)
    all_keys(this.merged_into).forEach((k) => {
      node.m(k, { at_rclk: new LogootInt(this.m(k).at_rclk) })
    })
    return node
  }

  toString(): string {
    return `REM${this.start.toString()} + ${this.length} @ ${this.rclk}`
  }
}
class BlankLogootNode extends LogootNode {
  copy(): BlankLogootNode {
    const node = new BlankLogootNode(
      { group: this.group, branch: this.branch },
      false
    )
    node.rclk = new LogootInt(this.rclk)
    all_keys(this.merged_into).forEach((k) => {
      node.m(k, { at_rclk: new LogootInt(this.m(k).at_rclk) })
    })
    return node
  }

  toString(): string {
    return `BLANK${this.start.toString()} + ${this.length} @ ${this.rclk}`
  }
}
type LogootNodeWithMeta = DataLogootNode & { offset: number }

class ConflictGroup {
  known_end = 0

  constructor(position: number) {
    this.known_end = position
  }
}

class LogootNodeGroup {
  length = 0
  start: LogootPosition = new LogootPosition()
  nodes: { [key: string]: LogootNode } = {}
  conflict?: ConflictGroup

  constructor(old?: LogootNodeGroup) {
    if (old) {
      Object.assign(this, {
        length: old.length,
        start: old.start.copy(),
        nodes: old.map_nodes((n) => {
          const newnode = n.copy()
          newnode.group = this
          return newnode
        }),
        conflict: old.conflict
      })
    }
  }

  /**
   * The end of the node. Note that technically there is not an atom at this
   * position, so it's fair game to have another node placed at this position.
   */
  get end(): LogootPosition {
    return this.start.offsetLowest(this.length)
  }

  get branches(): BranchKey[] {
    return all_keys(this.nodes)
  }
  get n_branches(): number {
    return this.branches.length
  }
  get conflicted(): boolean {
    return (
      this.branches.filter((k) => {
        return !(this.br(k) instanceof BlankLogootNode)
      }).length > 1
    )
  }

  each_node(cb: (n: LogootNode) => void): void {
    this.branches.forEach((k) => {
      cb(this.br(k))
    })
  }
  map_nodes(cb: (n: LogootNode) => LogootNode): { [key: string]: LogootNode } {
    const rval: { [key: string]: LogootNode } = {}
    this.branches.forEach((k) => {
      rval[(k as unknown) as string] = cb(this.br(k))
    })
    return rval
  }

  create_data_node(known_position: number, branch: BranchKey): DataLogootNode {
    const node = new DataLogootNode({ group: this, branch })
    node.known_position = known_position
    return node
  }

  br(key: BranchKey, node?: LogootNode): LogootNode {
    if (node) {
      this.nodes[(key as unknown) as string] = node
    }
    return this.nodes[(key as unknown) as string]
  }
  del_br(key: BranchKey): void {
    delete this.nodes[(key as unknown) as string]
  }

  split_around(pos: number): LogootNodeGroup {
    const newgroup = new LogootNodeGroup(this)
    newgroup.start = this.start.offsetLowest(pos)
    newgroup.length = this.length - pos
    newgroup.each_node((n) => {
      if (n instanceof DataLogootNode) {
        n.known_position += pos
      }
    })

    this.length = pos
    return newgroup
  }

  toString(): string {
    let str = `Group ${this.start.toString()} + ${this.length} {`
    str += this.branches.map((k) => {
      return `\n  ${String(k)}: ${this.br(k).toString()}`
    })
    str += '\n}'
    return str
  }
}

export {
  LogootInt,
  LogootPosition,
  LogootNode,
  DataLogootNode,
  RemovalLogootNode,
  BlankLogootNode,
  LogootNodeWithMeta,
  ConflictGroup,
  LogootNodeGroup,
  BranchKey
}
