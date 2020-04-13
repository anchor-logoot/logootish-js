/**
 * @file This file contains the bulky position manipulation logic for any list-
 * based CRDT (arrays, text, rich text, etc.)
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { NumberRange, RangeBounds } from '../compare'
import { FatalError, allValues, BreakException, catchBreak } from '../utils'
import { Bst, DBst } from '../bst'

import {
  LogootInt,
  LogootPosition,
  NodeType,
  ConflictGroup,
  LogootNodeGroup,
  BranchKey
} from './logoot'

import { debug } from '../debug'
import { ImmutableInt } from '../ints'

type KnownPositionBst = DBst<ConflictGroup>
type LogootBst = Bst<LogootNodeGroup, { start: LogootPosition }>

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
type TranslationOperation = {
  type: 't'
  source: number
  length: number
  dest: number
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
type Operation =
  | RemovalOperation
  | InsertionOperation
  | TranslationOperation
  | MarkOperation

/**
 * An error thrown when an insertion is attempted at the boundary between two
 * branches that are not the one in the active document.
 */
class InsertionConflictError extends Error {}

/**
 * A function that determines if two `LogootNodeGroup`s should be in the same
 * `ConflictGroup`. The two arguments must be in order.
 * @param a - The first `LogootNodeGroup`
 * @param b - The second `LogootNodeGroup`
 * @returns True if the two groups can be joined.
 */
type JoinFunction = (a: LogootNodeGroup, b: LogootNodeGroup) => boolean
/**
 * A `JoinFunction` that joins two nodes if they have the same branches that are
 * in conflict.
 */
const MinimalJoinFunction = (
  a: LogootNodeGroup,
  b: LogootNodeGroup
): boolean => {
  if (a.branches.filter((br) => !b.br(br)).length) {
    return false
  }
  if (b.branches.filter((br) => !a.br(br)).length) {
    return false
  }
  return true
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
   * The BST maps out where all insertion nodes are in the local document's
   * memory. It is used to go from position -> node
   */
  ldoc_bst: KnownPositionBst = new DBst()
  /**
   * This BST maps Logoot position identifiers to their text node to allow
   * lookup of text position from Logoot ID
   */
  logoot_bst: LogootBst = new Bst((a, b) => a.start.cmp(b.start))
  /** A map of removals that do not yet have text to remove */
  // removal_bst: LogootBst = new Bst((a, b) => a.start.cmp(b.start))
  /**
   * This is a Lamport clock. A proper vector clock would have too many entries
   * for large, multi-user documents.
   * See the Logoot paper for why. Unlike the Logoot implementation, this is
   * incremented with each removal only and is kept constant with insertions.
   */
  clock = new LogootInt()
  branch: BranchKey

  branch_order: BranchKey[] = []

  /**
   * An optional instance of the `ListDocumentModel.Logger` class to log all
   * operations that modify the BST (all calls to `_mergeNode`) to help with
   * bug identification when applicable.
   */
  debug_logger?: ListDocumentModel.Logger
  /**
   * An option that will run tests on the DBST after every operation to it.
   * **DO NOT** enable in production.
   */
  agressively_test_bst = false

  canJoin: JoinFunction

  constructor(branch: BranchKey, jf: JoinFunction = MinimalJoinFunction) {
    this.branch = branch
    this.canJoin = jf
  }

  /**
   * The goal of this method is to find the Logoot position corresponding to a
   * particular local position. Unlike the old version, this does **not**
   * actually record the insertion. The output of this must be passed in to
   * `insertLogoot` for that to happen. This provides greater flexibility for
   * the programmer. All insertions will be determined on the `branch` variable
   * of this class. This means that if this funcion is called and the start
   * position is in between two atoms, the first on `branch` and the second not,
   * the resulting order will leave the new atom after the first atom, but *not
   * necessarily* after the second atom since conflicts allow atoms to appear
   * out of their Logoot order. However, if an insertion is attempted between
   * two atoms on branches that are not `branch`, then it will not be possible
   * to determine where the resulting node should go. A `InsertionConflictError`
   * will be thrown. UI should respond to this by informing the user to resolve
   * the conflict first.
   * @param start - The position of the insertion
   * @param length - The length of the insertion
   * @returns An object containing `start` (a LogootPosition), `length`, `br`
   * (just `this.branch`), and `rclk` (just `this.clock`). The `start` value is
   * the only one that is actually calculated. The others are returned for
   * convenience.
   */
  insertLocal(
    start: number,
    length: number
  ): {
    start: LogootPosition
    length: number
    br: BranchKey
    rclk: LogootInt
  } {
    // Search:
    // n < start   -> _lesser
    // start <= n  -> _greater
    const { buckets } = this.ldoc_bst.search(
      new NumberRange(start, start, RangeBounds.LOGO)
    )

    let lesser: ConflictGroup
    let greater: ConflictGroup
    if (buckets.lesser && buckets.lesser.length) {
      // The earliest one will not be a only a removal if nodes are ordered
      // properly. We can ignore the removals in between
      lesser = buckets.lesser
        .map(([, cg]) => cg)
        .sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0]
    }
    if (buckets.greater && buckets.greater.length) {
      // Now grab the last element...
      greater = buckets.greater
        .map(([, cg]) => cg)
        .sort((a, b) => b.logoot_start.cmp(a.logoot_start))[0]
    }

    let before_position
    let after_position

    const lesser_length = lesser ? lesser.ldoc_length : 0
    if (lesser && lesser.known_position + lesser_length === start) {
      // Between two CGs...
      if (
        greater &&
        lesser.last_branch === greater.first_branch &&
        lesser.last_branch !== this.branch
      ) {
        // If we're between two CGs and they both are on the same branch, it's
        // impossible to tell on which the insertion should be made
        throw new InsertionConflictError()
      }
      before_position = lesser.logoot_end
      after_position = greater ? greater.logoot_start : undefined
    } else if (lesser) {
      ;((): void => {
        let remaining_length = start - lesser.known_position
        if (lesser.branch_order.indexOf(this.branch) < 0) {
          remaining_length -= lesser.ldoc_length
        } else {
          remaining_length -= lesser.branchLength(
            lesser.branch_order.slice(
              0,
              lesser.branch_order.indexOf(this.branch)
            )
          )
        }
        if (remaining_length < 0) {
          throw new FatalError('Search returned out of order nodes')
        }
        if (remaining_length === 0) {
          // We're at the left end here, so we have to look up *another* lesser
          // Search:
          // n < lesser.known_position   -> _lesser
          // lesser.known_position <= n  -x
          // TODO: Don't find `greater`. Maybe make a range that ignores one
          // bound?
          // TODO: What about the case where two CGs have the same start
          // position?
          const { buckets } = this.ldoc_bst.search(
            new NumberRange(
              lesser.known_position,
              lesser.known_position,
              RangeBounds.LOGC
            )
          )

          let most_lesser
          if (buckets.lesser && buckets.lesser.length) {
            most_lesser = buckets.lesser
              .map(([, cg]) => cg)
              .sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0]
          }
          // Now, go in between the two nodes just as we would've above
          before_position = most_lesser.logoot_end
          after_position = lesser.logoot_start
          return
        }

        // So, we're not at the start. Find a good position
        for (let i = 0; i < lesser.groups.length; i++) {
          const { end } = lesser.groups[i]
          remaining_length -= lesser.groups[i].branchLength([this.branch])

          if (remaining_length < 0) {
            before_position = after_position = end.inverseOffsetLowest(
              -remaining_length
            )
            return
          } else if (remaining_length === 0) {
            before_position = end
            after_position = lesser.groups[i + 1]
              ? lesser.groups[i + 1].start
              : greater
              ? greater.logoot_start
              : undefined
            return
          }
        }
        // We must be in between two branches that are not ours
        throw new InsertionConflictError()
      })()
    } else if (greater) {
      after_position = greater.logoot_start
    }

    return {
      start: new LogootPosition(length, before_position, after_position),
      length,
      br: this.branch,
      rclk: this.clock
    }
  }

  /**
   * Finds the sets of Logoot positions in a certain real text range. This is
   * used to find the removal operations to perform, but it does **not**
   * actually record the updates, just like `insertLocal`.
   * @param start - The position to start removing, inclusive.
   * @param length - The length of the removal
   * @returns - An object containing an array of `removals`. Each removal has a
   * `start` LogootPosition, a numeric `length`, a `branch` (which is a
   * BranchKey), and a `rclk` vector clock value.
   */
  removeLocal(start: number, length: number): { removals: Removal[] } {
    // Search:
    // n < start   -> _lesser
    // start <= n  -> _greater
    const { buckets } = this.ldoc_bst.search(
      new NumberRange(start, start + length, RangeBounds.LOGC)
    )

    const nodes = buckets.range.map(([, cg]) => cg)
    if (buckets.lesser && buckets.lesser.length) {
      // The earliest one will not be a only a removal if nodes are ordered
      // properly. We can ignore the removals in between
      const l = buckets.lesser
        .map(([, cg]) => cg)
        .sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0]
      if (l.ldoc_end > start) {
        nodes.unshift(l)
      }
    }

    const removal_sets: { [key: string]: { [key: number]: Removal[] } } = {}
    function onRemoval(
      br: BranchKey,
      start: LogootPosition,
      len: number,
      rclk: LogootInt
    ): void {
      if (len <= 0) {
        return
      }
      if (!removal_sets[(br as unknown) as string]) {
        removal_sets[(br as unknown) as string] = {}
      }
      const branch_removals = removal_sets[(br as unknown) as string]

      if (!branch_removals[start.levels]) {
        branch_removals[start.levels] = []
      }
      const depth_removals = branch_removals[start.levels]
      const last_removal = depth_removals[depth_removals.length - 1]

      if (
        last_removal &&
        last_removal.branch === br &&
        last_removal.start.offsetLowest(last_removal.length).cmp(start) === 0 &&
        last_removal.rclk.cmp(rclk) === 0
      ) {
        last_removal.length += len
      } else {
        depth_removals.push({ branch: br, start, length: len, rclk })
      }
    }

    let remaining_length = start + length - nodes[0].known_position
    // TODO: This is *really* inefficient for obvious reasons
    catchBreak(() =>
      nodes.forEach((cg) => {
        cg.branch_order.forEach((br) => {
          cg.groups.forEach((group) => {
            if (!group.br(br)) {
              return
            }
            let { start, length: rlen } = group
            const { type, rclk } = group.br(br)

            if (type === NodeType.DATA) {
              if (remaining_length > length) {
                start = start.offsetLowest(remaining_length - length)
                rlen -= remaining_length - length
              }
              onRemoval(br, start, Math.min(rlen, remaining_length), rclk)
              remaining_length -= group.length
            }
            if (remaining_length <= 0) {
              throw BreakException
            }
          })
        })
      })
    )

    const removals: Removal[] = []
    allValues(removal_sets).forEach((branch_set) => {
      Object.entries(branch_set).forEach(([, depth_set]) => {
        depth_set.forEach((o) => removals.push(o))
      })
    })

    return { removals }
  }

  /**
   * This is the most important method in the `ListDocumentModel`. This method
   * adds atoms to the BSTs. By consequence, it replaces nodes and generates
   * conflicts as necessary to add the node to the BST. **Users should never
   * call this function directly.**
   * @param br - The branch to insert on
   * @param nstart - The start Logoot position of the insertion
   * @param length - The length of the insertion
   * @param nrclk - The clock value for the insertion
   * @param type - The type of node to add. Anything other than data will result
   * in data being removed if it conflicts on the same branch
   * @param canJoin - A `JoinFunction` to determine if two node groups should
   * be joined together in the same conflict group
   */
  _mergeNode(
    br: BranchKey,
    nstart: LogootPosition,
    length: number,
    nrclk: LogootInt,
    type: NodeType,
    canJoin: JoinFunction
  ): Operation[] {
    nstart.immutable = true
    nrclk = (new ImmutableInt<LogootInt>(nrclk) as unknown) as LogootInt
    if (this.debug_logger) {
      this.debug_logger.log({
        br,
        start: nstart,
        length,
        rclk: nrclk,
        type
      })
    }

    debug.info(`Merging ${type} ${String(br)} ${nstart} + ${length} @ ${nrclk}`)

    const level = nstart.levels
    const nend = nstart.offsetLowest(length)

    if (this.clock.cmp(nrclk) < 0) {
      this.clock.assign(nrclk)
    }

    if (!this.branch_order.includes(br)) {
      this.branch_order.push(br)
    }

    // Search:
    // n < nstart          -> _lesser
    // nstart <= n < nend  -> _skip_ranges
    // nend <= n           -> _greater
    const range_search = this.logoot_bst.create_range_search()
    range_search.lesser_find_greatest = true
    range_search.greater_find_least = true
    range_search.push_point({ start: nstart }, '_lesser', false)
    range_search.push_point({ start: nend }, '_skip_ranges', false)
    range_search.all_greater('_greater')
    const { _lesser, _skip_ranges, _greater } = this.logoot_bst.search(
      range_search
    )

    let lesser
    let greater
    if (_lesser && _lesser.length > 1) {
      throw new FatalError(
        'Corrupt BST. There are multiple nodes at a position.'
      )
    } else if (_lesser && _lesser.length) {
      lesser = _lesser[0]
    }
    if (_greater && _greater.length > 1) {
      throw new FatalError(
        'Corrupt BST. There are multiple nodes at a position.'
      )
    } else if (_greater && _greater.length) {
      greater = _greater[0]
    }
    let skip_ranges = _skip_ranges
      ? _skip_ranges.sort((a, b) => a.start.cmp(b.start))
      : []

    if (lesser && skip_ranges.includes(lesser)) {
      skip_ranges.splice(skip_ranges.indexOf(lesser), 1)
    }
    if (greater && skip_ranges.includes(greater)) {
      skip_ranges.splice(skip_ranges.indexOf(greater), 1)
    }
    if (lesser) {
      skip_ranges.unshift(lesser)
    }
    // Split lesser if there's no way that it will conflict (which will be if
    // it's on a higher level)
    if (
      lesser &&
      lesser.start.levels < level &&
      lesser.start.cmp(nstart) < 0 &&
      lesser.end.cmp(nend) > 0
    ) {
      const split_pos = nstart
        .copy()
        .level(lesser.start.levels)
        .sub(lesser.start.level(lesser.start.levels)).js_int
      if (split_pos > 0 && split_pos < lesser.length) {
        const lesser_end = lesser.splitAround(split_pos)
        skip_ranges.push(lesser_end)
        this.logoot_bst.add(lesser_end)
      }
    }
    if (greater && !skip_ranges.includes(greater)) {
      skip_ranges.push(greater)
    }

    // Keep track of all the conflict groups we're automatically modifying
    let conflict_order: ConflictGroup[] = []
    if (skip_ranges.length) {
      const ke = skip_ranges[skip_ranges.length - 1].group.ldoc_end

      conflict_order = this.ldoc_bst
        .search(new NumberRange(skip_ranges[0].group.known_position, ke))
        .buckets.range.sort((a, b) => a[0] - b[0])
        .map(([, cg]) => cg)
    }

    // Nodes on higher levels do not matter in our collision search, only in the
    // sorting done by the BSTs. Lower levels matter since we must skip them.
    // HOWEVER, we do need a greater node so that the algorithm will detect the
    // next CG and (maybe) join into it
    // TODO: Maybe a better search algo could come up with a pre-filtered
    // `skip_ranges` for me
    skip_ranges = skip_ranges.filter(
      ({ start }) => start.levels >= level || start.cmp(nend) >= 0
    )

    // Ensure that there's something at the end of the list so that it will
    // always run regardless and if there are nodes, that there is always a node
    // last in the array at the end position
    if (
      !skip_ranges.length ||
      skip_ranges[skip_ranges.length - 1].start.cmp(nend) < 0
    ) {
      const vgroup = new LogootNodeGroup()
      vgroup.start = nend
      skip_ranges.push(vgroup)
    }

    /* const original_known_end = conflict_order.length
      ? conflict_order[conflict_order.length - 1].ldoc_end
      : 0 */

    // Track all the operations that have been performed and the offset that
    // should be placed on nodes after this one. This will modify the nodes
    // in `conflict_order`
    const operations: Operation[] = []
    const remove = (cg: ConflictGroup, start: number, length: number): void => {
      if (length === 0) {
        return
      }
      operations.push({
        type: 'r',
        start,
        length
      })
      const successor = cg.inorder_successor
      if (successor) {
        successor.addSpaceBefore(-length, (np) => (this.ldoc_bst.bst_root = np))
        if (this.agressively_test_bst) {
          this.ldoc_bst.selfTest()
        }
      }
    }
    const insert = (
      cg: ConflictGroup,
      start: number,
      offset: number,
      length: number
    ): void => {
      if (length === 0) {
        return
      }
      operations.push({
        type: 'i',
        start,
        offset,
        length
      })
      const successor = cg.inorder_successor
      if (successor) {
        successor.addSpaceBefore(length, (np) => (this.ldoc_bst.bst_root = np))
        if (this.agressively_test_bst) {
          this.ldoc_bst.selfTest()
        }
      }
    }
    const translate = (source: number, length: number, dest: number): void => {
      if (length === 0) {
        return
      }
      if (source === dest) {
        return
      }
      operations.push({ type: 't', source, length, dest })
    }
    const mark = (
      start: number,
      length: number,
      conflicting: boolean
    ): void => {
      if (length === 0) {
        return
      }
      operations.push({ type: 'm', start, length, conflicting })
    }

    // Split a conflict group and translate the child nodes
    const splitCg = (cg: ConflictGroup, ng: LogootNodeGroup): ConflictGroup => {
      if (!cg.groups.includes(ng)) {
        throw new FatalError('Node group not in conflict group.')
      }
      if (!conflict_order.includes(cg)) {
        throw new FatalError('Conflict group not in conflict_order')
      }

      // New Conflict Group -- Ok, my naming is bad here lol
      const ncg = new ConflictGroup(cg.ldoc_end, this.branch_order)

      let known_position = cg.known_position
      const known_end = ncg.known_position
      this.branch_order.forEach((br) => {
        // Calculate the area ahead of the known_position that isn't moved
        const excerpt_length = ((): number => {
          let origin = 0
          for (let i = 0; i < cg.groups.length; i++) {
            origin += cg.groups[i].branchLength([br])
            if (cg.groups[i] === ng) {
              return origin
            }
          }
          // This should never happen
          throw new FatalError()
        })()

        const moved_length = cg.branchLength([br]) - excerpt_length

        ncg.value -= moved_length
        known_position += excerpt_length
        translate(known_position, moved_length, known_end - moved_length)
      })

      ncg.groups = cg.groups.splice(cg.groups.indexOf(ng) + 1, cg.groups.length)
      ncg.groups.forEach((group) => (group.group = ncg))

      this.ldoc_bst.add(ncg)
      if (this.agressively_test_bst) {
        this.ldoc_bst.selfTest()
      }
      conflict_order.splice(conflict_order.indexOf(cg) + 1, 0, ncg)

      return ncg
    }
    // Join a conflict group and translate the child nodes
    const joinCg = (lcg: ConflictGroup, ncg: ConflictGroup): void => {
      // Ensure that we remove **only** this node from the BST
      if (
        this.ldoc_bst.remove(ncg.known_position, (other) => other === ncg)
          .length !== 1
      ) {
        throw new FatalError(
          'Could not find other node to remove node that has been joined'
        )
      }
      if (this.agressively_test_bst) {
        this.ldoc_bst.selfTest()
      }

      ncg.groups.forEach((group) => (group.group = lcg))
      lcg.groups.splice(lcg.groups.length, 0, ...ncg.groups)

      let fetch_position = ncg.known_position
      let known_position = lcg.known_position
      this.branch_order.forEach((br) => {
        // Get the length of the new branch
        const next_length = ncg.branchLength([br])
        // Move to the end of the existing branch
        // Note that we have to subtract `next_length` since the LNGs have
        // already been added to the CG
        known_position += lcg.branchLength([br]) - next_length

        translate(fetch_position, next_length, known_position)
        // Add to the fetch position (remember, in translate, position of
        // successive text is conserved)
        fetch_position += next_length
        // Now, add the remaining `branchLength` to the `known_position` since
        // we've now translated there
        known_position += next_length
      })

      ncg.groups = []
      conflict_order.splice(conflict_order.indexOf(ncg), 1)
    }

    let last_start = nstart.level(level)
    let last_group = lesser
    skip_ranges.forEach((group, i) => {
      // Can be reassigned when nodes are split
      let next_group = skip_ranges[i + 1]

      const group_level_start = group.start.clamp(nstart, nend, level).l(level)
        .i
      const group_level_end = group.end.clamp(nstart, nend, level).l(level).i

      const empty_length = group_level_start.copy().sub(last_start).js_int
      const empty_offset = last_start.copy().sub(nstart.l(level)).js_int

      // First, add a new group to the empty space (if there is any)
      if (
        empty_length > 0 ||
        // If the next node has fewer levels, the empty space is *technically*
        // infinite, but empty_length won't show this
        (group.start.levels < level &&
          length - empty_offset > 0 &&
          group.start.cmp(nstart) > 0 &&
          last_start.cmp(nstart.l(level)) < 0)
      ) {
        const newgroup = new LogootNodeGroup()
        newgroup.start = nstart.copy()
        newgroup.start.l(level).assign(last_start)
        newgroup.length = empty_length || length - empty_offset
        newgroup.br(br, { type, rclk: nrclk })
        debug.info(`Creating new group at ${newgroup.start.toString()}`)

        // Now, we actually insert the node where it should be according to the
        // node canJoin function
        // First, check if we can join with the two nodes flanking this one
        // Remember, we're operating BEFORE `group`
        const last_join = last_group && canJoin(last_group, newgroup)
        const next_join = group && canJoin(newgroup, group)
        const already_joined =
          last_group && group && last_group.group === group.group

        if (!already_joined && last_join && next_join) {
          // Join last and next
          joinCg(last_group.group, group.group)
        } else if (already_joined && !(last_join && next_join)) {
          // Split last and next
          splitCg(last_group.group, last_group)
        }

        if (!last_join && !next_join) {
          // Ok, so now we need to create a new conflict group
          newgroup.group = new ConflictGroup(
            last_group ? last_group.group.ldoc_end : 0,
            this.branch_order
          )

          conflict_order.splice(
            last_group ? conflict_order.indexOf(last_group.group) + 1 : 0,
            0,
            newgroup.group
          )
        } else {
          // Now, make sure we have a target group
          newgroup.group = last_join ? last_group.group : group.group
        }

        if (type === NodeType.DATA) {
          const ipos = newgroup.group.insertSingleBranchGroup(newgroup)
          if (!last_join && !next_join) {
            this.ldoc_bst.add(newgroup.group)
            if (this.agressively_test_bst) {
              this.ldoc_bst.selfTest()
            }
          }
          insert(newgroup.group, ipos, empty_offset, newgroup.length)
        } else {
          newgroup.group.insertSingleBranchGroup(newgroup)
          if (!last_join && !next_join) {
            this.ldoc_bst.add(newgroup.group)
            if (this.agressively_test_bst) {
              this.ldoc_bst.selfTest()
            }
          }
        }

        last_group = newgroup
        this.logoot_bst.add(newgroup)
      }

      const group_length = group_level_end.copy().sub(group_level_start).js_int
      const group_offset = group_level_start.copy().sub(nstart.l(level)).js_int
      // Now, add the new node to the existing group
      if (
        group.start.levels === level &&
        group_length > 0 &&
        (!group.br(br) ||
          // Data nodes have the lowest priority
          nrclk.cmp(group.br(br).rclk) > (type === NodeType.DATA ? 0 : -1))
      ) {
        // Split off the trailing start
        if (group.start.cmp(nstart) < 0) {
          last_group = group
          group = group.splitAround(
            nstart
              .l(level)
              .copy()
              .sub(group.start.l(level)).js_int
          )
          this.logoot_bst.add(group)
        }
        // Split off the trailing end
        if (group.end.cmp(nend) > 0) {
          const newgroup = group.splitAround(
            group.length -
              group.end
                .l(level)
                .copy()
                .sub(nend.l(level)).js_int
          )
          this.logoot_bst.add(newgroup)
          next_group = newgroup
        }
        debug.info(`Adding to existing group at ${group.start.toString()}`)

        // Now, capture this node's target position
        const known_position = group.group.insertPos(br, group)
        // Remove old conflicts
        if (group.br(br) && group.br(br).type === NodeType.DATA) {
          remove(group.group, known_position, group.length)
        }
        // Ensure the new data is correct
        group.br(br, { type, rclk: nrclk })
        // Add new data
        if (type === NodeType.DATA) {
          insert(group.group, known_position, group_offset, group.length)
        }

        const fixJoined = (a: LogootNodeGroup, b: LogootNodeGroup): void => {
          if (!a || !b) {
            return
          }
          const joined = a.group === b.group
          const should_join = canJoin(a, b)
          if (!joined && should_join) {
            joinCg(a.group, b.group)
          } else if (joined && !should_join) {
            // The BST allows chaning of the `known_position` after adding a
            // node, **so long as the nodes are in the same order.** Since not
            // all node positions have been updated, we cannot add the node with
            // the pre-incremented position
            splitCg(a.group, a)
          }
        }

        // Double check that these nodes still should be joined
        fixJoined(last_group, group)
        fixJoined(group, next_group)
      }

      last_start = group.end.clamp(nstart, nend, level).level(level)
      last_group = group
    })

    // TODO: Actually figure out which CGs have changed state
    conflict_order.forEach(({ known_position, ldoc_length, conflicted }) => {
      mark(known_position, ldoc_length, conflicted)
    })

    return operations
  }

  insertLogoot(
    br: BranchKey,
    start: LogootPosition,
    length: number,
    rclk: LogootInt
  ): Operation[] {
    return this._mergeNode(br, start, length, rclk, NodeType.DATA, this.canJoin)
  }

  removeLogoot(
    br: BranchKey,
    start: LogootPosition,
    length: number,
    rclk: LogootInt
  ): Operation[] {
    return this._mergeNode(
      br,
      start,
      length,
      rclk,
      NodeType.REMOVAL,
      this.canJoin
    )
  }

  /**
   * An extremely expensive operation that scans the BSTs for obvious signs of
   * corruption (empty CGs, non-continuous ldoc, out-of-order ldoc, etc.)
   * @throws {FatalError} If any corruption detected
   */
  selfTest(): void {
    this.ldoc_bst.selfTest()

    let last_pos: LogootPosition
    let last_kp = 0
    this.ldoc_bst.operateOnAll((data) => {
      if (!data.groups.length) {
        throw new FatalError('Node with no groups detected.')
      }
      if (data.known_position !== last_kp) {
        throw new Error(
          `Ldoc is out of order. Found known position ${data.known_position} after ${last_kp}`
        )
      }
      last_kp = data.ldoc_end
      data.groups.forEach(({ start }) => {
        if (last_pos && last_pos.cmp(start) >= 0) {
          throw new FatalError(
            `Ldoc is out of order. Found ${start.toString()} after ${last_pos.toString()}.`
          )
        }
        last_pos = start
      })
    })
  }
}

namespace ListDocumentModel {
  export type LogOperation = {
    br: BranchKey
    start: LogootPosition
    length: number
    rclk: LogootInt
    type: NodeType
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
}

export {
  LogootInt,
  LogootPosition,
  KnownPositionBst,
  LogootBst,
  Removal,
  ListDocumentModel,
  NodeType
}
