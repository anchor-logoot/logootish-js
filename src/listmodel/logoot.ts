/**
 * @file This contains most of the data types used by the `ListDocumentModel`.
 * While `index.ts` does most of the heavy lifting, this file is the source of
 * most definitions used there. The files were split to make it easier for me to
 * switch since I can switch using tabs in my text editor.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { DBstNode, DBstSearchable } from '../bst'
import { Int32 } from '../ints'
import { CompareResult, FatalError, allKeys } from '../utils'

// What a C++ typedef would do
// This makes it possible to completely swap out the type of the int used in the
// algorithm w/o actually replacing each instance (which would be a real pain)
import LogootInt = Int32

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
  immutable = false

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
  static fromInts(...ints: (LogootInt | number)[]): LogootPosition {
    const pos = new LogootPosition()
    pos.array.length = 0
    ints.forEach((n) => {
      pos.array.push(new LogootInt(n))
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
    if (this.immutable) {
      return this.array[n] && this.array[n].i
    }
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
   * @returns Either this position, min, or max. It is **not** copied, so if you
   * want to modify it, you should copy it.
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

/**
 * A type used to identify a branch. This value should be used to look up a
 * user-presentable name in another map stored outside of `logootish-js`. This
 * is implementation-defined and allows for the broadest possible definition of
 * a branch.
 */
type BranchKey = symbol | string | number

/**
 * The type of node stored in a `LogootNodeGroup`.
 */
enum NodeType {
  DATA,
  REMOVAL
}
/**
 * Names for NodeType that are printed in debug information.
 */
const nt_string = {
  [NodeType.DATA]: 'DATA',
  [NodeType.REMOVAL]: 'REMOVAL'
}

/**
 * A group of `LogootNodeGroup`s that are considered by the `JoinFunction` (see
 * the list document model `index.ts` file) to be related. Each Logoot node is
 * not displayed in the order specified in `groups`. Rather, all of the nodes on
 * a particular branch are displayed together and in the order defined by
 * `branch_order`.
 */
class ConflictGroup extends DBstNode<ConflictGroup> {
  /**
   * A list of `LogootNodeGroups` that make up the Logoot side of the local
   * document. A group's nodes will be split up and placed into one of the
   * branch sections as defined in `branch_order`. These **absolutely must** be
   * in order based on their Logoot positions.
   */
  groups: LogootNodeGroup[] = []

  /**
   * @param position - The local position of this CG
   * @param branch_order - The order in which branches are displayed. All of
   * the nodes that make up a single branch are placed together. This is now
   * global on the LDM level, so a reference should be passed in by the LDM.
   */
  constructor(position: number, public readonly branch_order: BranchKey[]) {
    super(position)
  }

  get known_position(): number {
    return this.absolute_value
  }

  /**
   * Get the equivalent length of all data nodes.
   */
  get ldoc_length(): number {
    return this.groups.reduce((n, group) => {
      return n + group.ldoc_length
    }, 0)
  }
  /**
   * Find the end in the local document,
   */
  get ldoc_end(): number {
    return this.known_position + this.ldoc_length
  }

  /**
   * Get the first group's Logoot position
   */
  get logoot_start(): LogootPosition {
    return this.groups[0] ? this.groups[0].start : undefined
  }
  /**
   * Get the last group's Logoot position
   */
  get logoot_end(): LogootPosition {
    return this.groups.length
      ? this.groups[this.groups.length - 1].end
      : undefined
  }

  /**
   * Search this node (and potentially the BST) for the closest data position
   * greater than or equal to the start of this CG.
   * @param br The branch to search
   * @param search_bst Whether to use the BST to find the inorder successor and
   * search that if this CG does not contain the node
   * @returns The position of the first data node in this node or successors.
   */
  get first_data_position(): LogootPosition {
    for (let i = 0; i < this.groups.length; i++) {
      if (this.groups[i].has_data) {
        return this.groups[i].start
      }
    }
    const s = this.inorder_successor
    return s && s.first_data_position
  }

  /**
   * Search this node (and potentially the BST) for the closest data position
   * less than or equal to the end of this CG.
   * @param br The branch to search
   * @param search_bst Whether to use the BST to find the inorder successor and
   * search that if this CG does not contain the node
   * @returns The position of the last data node in this node or predecessors.
   */
  get last_data_position(): LogootPosition {
    for (let i = this.groups.length - 1; i >= 0; i--) {
      if (this.groups[i].has_data) {
        return this.groups[i].end
      }
    }
    const s = this.inorder_predecessor
    return s && s.last_data_position
  }

  preferential_cmp(other: DBstSearchable | ConflictGroup): CompareResult {
    if (!this.groups.length) {
      throw new FatalError(
        'Tried to call `preferential_cmp` on a CG with no LNGs'
      )
    }
    if ((other as { logoot_start: LogootPosition }).logoot_start) {
      return this.logoot_start.cmp((other as ConflictGroup).logoot_start)
    }
    return 0
  }

  /**
   * Get the first branch in this group.
   */
  get first_branch(): BranchKey {
    if (!this.groups.length || !this.branch_order.length) {
      return
    }
    for (let i = 0; i < this.branch_order.length; i++) {
      if (this.groups[0].br(this.branch_order[i])) {
        return this.branch_order[i]
      }
    }
    throw new FatalError('Branch order does not contain any branches from LNG')
  }
  /**
   * Get the last branch in this group.
   */
  get last_branch(): BranchKey {
    if (!this.groups.length || !this.branch_order.length) {
      return
    }
    const last = this.groups[this.groups.length - 1]
    for (let i = this.branch_order.length - 1; i >= 0; i--) {
      if (last.br(this.branch_order[i])) {
        return this.branch_order[i]
      }
    }
    throw new FatalError('Branch order does not contain any branches from LNG')
  }

  /**
   * True if any groups are conflicted.
   */
  get conflicted(): boolean {
    return this.groups.some((g) => g.conflicted)
  }
  /**
   * The length in the local document (only `DATA` nodes) of only `branches`.
   * @param branches - A list of branches to count.
   */
  branchLength(branches: BranchKey[]): number {
    return this.groups.reduce((n, group) => {
      return n + group.branchLength(branches)
    }, 0)
  }

  /**
   * Find the position in the local document of a group that **is already** in
   * this `ConflictGroup`. This is named `insertPos` because it is used to find
   * the insertion position of a new group, but the naming is a bit confusing.
   * @param br - The branch on which to determine the position.
   * @param at - The LogootNodeGroup to determine the position of.
   * @returns The position of `at`.
   * @throws {FatalError} Will throw if `after` is not in this CG.
   */
  insertPos(br: BranchKey, at: LogootNodeGroup): number {
    // First, compute the offset for all of the previous branches (ex, A and B)
    // AAAAAAABBBBccccccdddddeeee
    let offset =
      this.known_position +
      this.branchLength(
        this.branch_order.slice(0, this.branch_order.indexOf(br) + (at ? 0 : 1))
      )

    if (!at) {
      return offset
    }

    // Sum up all of the prior groups on our branch
    for (let i = 0; i < this.groups.length; i++) {
      // Once we've found our group, bail out
      if (this.groups[i] === at) {
        return offset
      }
      offset += this.groups[i].branchLength([br])
    }
    throw new FatalError(
      'Tried to insert after a LogootNodeGroup that is not in this conflict group'
    )
  }

  /**
   * Get the nodes to the left and right of `start`. If there is already a
   * `LogootNodeGroup` with the same position, behavior is undefined.
   * @param start - The position for which to find neighbors of.
   * @returns An object containing `left` and `right` `LogootNodeGroup`s, as
   * well as a `pos` number, which is the position of `right` in `this.groups`.
   */
  getNeighbors({
    start
  }: LogootNodeGroup): {
    left: LogootNodeGroup
    right: LogootNodeGroup
    pos: number
  } {
    let left
    for (let i = 0; i < this.groups.length; i++) {
      if (this.groups[i].start.cmp(start) <= 0) {
        left = this.groups[i]
      }
      if (this.groups[i].start.cmp(start) > 0) {
        return { left, right: this.groups[i], pos: i }
      }
    }
    return { left, right: undefined, pos: this.groups.length }
  }

  /**
   * Adds a group with only one branch to this CG and returns its position.
   * @param group - The group to add.
   * @returns The position in the local document of the insertion.
   * @throws {TypeError} If the group has more than one branch or if the group's
   * `ConflictGroup` is not set to `this`. Set `group.group` to this before
   * calling to avoid this error.
   */
  insertSingleBranchGroup(group: LogootNodeGroup): number {
    if (group.n_branches !== 1) {
      throw new TypeError('Passed group with no or more than one branch')
    }
    if (group.group !== this) {
      throw new TypeError('Conflict group not assigned to node group')
    }

    const br = group.branches[0]

    const { right, pos } = this.getNeighbors(group)

    const known_position = this.insertPos(br, right)
    this.groups.splice(pos, 0, group)
    return known_position
  }

  toString(): string {
    let str = `Conflict @ ${this.known_position} (`
    str += this.branch_order.map((br) => br.toString()).join(' ')
    str += `) {`
    str += this.groups.map((gr) => {
      return (
        '\n  ' +
        gr
          .toString()
          .split('\n')
          .join('\n  ')
      )
    })
    str += '\n}'
    return str
  }
}

type LogootNode = { type: NodeType; rclk: LogootInt }
/**
 * A group of nodes that are all on different branches and have different vector
 * clock values, but share the same **Logoot** start, end, and length.
 */
class LogootNodeGroup {
  length = 0
  start: LogootPosition = new LogootPosition()
  group: ConflictGroup
  /**
   * The `LogootNode`s in this group. Despite what TypeScript thinks, they key
   * is **not** a string. It is a BranchKey. Problem is, TS doesn't support
   * using symbols to index a type, which will hopefully fixed when
   * [TypeScript PR #26797](https://github.com/microsoft/TypeScript/pull/26797) lands.
   * In the mean time, using `as` to turn the BranchKey into a string is used as
   * a hacky workaround.
   */
  nodes: { [key: string]: LogootNode } = {}

  constructor(old?: LogootNodeGroup) {
    if (old) {
      Object.assign(this, {
        length: old.length,
        start: old.start.copy(),
        group: old.group
      })
      old.eachNode(({ type, rclk }, k) => {
        this.br(k, { type, rclk: new LogootInt(rclk) })
      })
    }
  }

  /**
   * Gets the length of all `DATA` nodes.
   */
  get ldoc_length(): number {
    // For some reason, TS thinks that this will produce a BranchKey. Obviously,
    // it doesn't, so I have to do the awkward "as unknown as number" cast :(
    return (this.branches.reduce((n: number, br: number) => {
      return this.br(br).type === NodeType.DATA ? n + this.length : n
    }, 0) as unknown) as number
  }

  /**
   * Gets the length of all `DATA` nodes on `branches`.
   * @param branches - The branches to search.
   * @returns The length of all `DATA` nodes
   */
  branchLength(branches: BranchKey[]): number {
    return (this.branches
      .filter((k) => branches.includes(k))
      .reduce((n: number, br: number) => {
        return this.br(br).type === NodeType.DATA ? n + this.length : n
      }, 0) as unknown) as number
  }

  /**
   * Returns true if this LNG has length in the local document.
   */
  get has_data(): boolean {
    return this.branches.some((br) => this.br(br).type === NodeType.DATA)
  }

  /**
   * The end of the node. Note that technically there is not an atom at this
   * position, so it's fair game to have another node placed at this position.
   */
  get end(): LogootPosition {
    return this.start.offsetLowest(this.length)
  }

  get branches(): BranchKey[] {
    return allKeys(this.nodes)
  }
  get n_branches(): number {
    return this.branches.length
  }
  /**
   * Returns true if there are multiple branches
   */
  get conflicted(): boolean {
    return this.n_branches > 1
    /* return ( // TODO: Fix
      this.branches.filter((k) => {
        return this.br(k).type !== NodeType.MERGE_INTO
      }).length > 1
    ) */
  }

  eachNode(cb: (n: LogootNode, k: BranchKey) => void): void {
    this.branches.forEach((k) => {
      cb(this.br(k), k)
    })
  }
  mapNodes(
    cb: (n: LogootNode, k: BranchKey) => LogootNode
  ): {
    [key: string]: LogootNode
  } {
    const rval: { [key: string]: LogootNode } = {}
    this.branches.forEach((k) => {
      rval[(k as unknown) as string] = cb(this.br(k), k)
    })
    return rval
  }

  /**
   * This is a method to access and (possibly) assign a `LogootNode` to the
   * particular branch. This is a thing because TypeScript does not yet support
   * using symbols as keys and I don't feel like typing
   * `(key as unknown) as string` a billion times. See
   * [TypeScript PR #26797](https://github.com/microsoft/TypeScript/pull/26797).
   */
  br(key: BranchKey, node?: LogootNode): LogootNode {
    if (node) {
      this.nodes[(key as unknown) as string] = node
    }
    return this.nodes[(key as unknown) as string]
  }
  delBr(key: BranchKey): void {
    delete this.nodes[(key as unknown) as string]
  }

  /**
   * Split this LogootNodeGroup around a position `pos` units after the current
   * start on the lowest level.
   * @param pos - The location of where to split this group.
   * @returns A new LogootNodeGroup. This is spliced into this conflict group,
   * so no cleanup is necessary after this is run.
   */
  splitAround(pos: number): LogootNodeGroup {
    const newgroup = new LogootNodeGroup(this)
    newgroup.start = this.start.offsetLowest(pos)
    newgroup.length = this.length - pos

    // Ensure that we're in the right order in the ConflictGroup
    const groups = newgroup.group.groups
    groups.splice(groups.indexOf(this) + 1, 0, newgroup)

    this.length = pos
    return newgroup
  }

  toString(): string {
    let str = `Group ${this.start.toString()} + ${this.length} {`
    str += this.branches.map((k) => {
      const br = this.br(k)
      return `\n  ${String(k)}: ${nt_string[br.type]} @ ${br.rclk.toString()}`
    })
    str += '\n}'
    return str
  }
}

export {
  LogootInt,
  LogootPosition,
  NodeType,
  ConflictGroup,
  LogootNodeGroup,
  BranchKey
}
