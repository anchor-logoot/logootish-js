/**
 * @file This file contains the bulky position manipulation logic for any list-
 * based CRDT (arrays, text, rich text, etc.)
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import {
  FatalError,
  CompareResult,
  allValues,
  BreakException,
  catchBreak
} from '../utils'
import { debug } from '../debug'
import { Bst } from '../bst'

import {
  LogootInt,
  LogootPosition,
  NodeType,
  ConflictGroup,
  LogootNodeGroup,
  BranchKey
} from './logoot'

type KnownPositionBst = Bst<ConflictGroup, { known_position: number }>
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
/**
 * An operation returned by `_mergeNode` to be run on the local document.
 */
type Operation =
  | { type: 'r'; start: number; length: number }
  | { type: 'i'; start: number; offset: number; length: number }
  | { type: 't'; source: number; length: number; dest: number }
  | { type: 'm'; start: number; length: number; conflicting: boolean }

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
 * @TODO Conflict resolution does not exist. **This will create significant
 * changes to this API**
 */
class ListDocumentModel {
  /**
   * The BST maps out where all insertion nodes are in the local document's
   * memory. It is used to go from position -> node
   */
  ldoc_bst: KnownPositionBst = new Bst(
    (a, b) => (a.known_position - b.known_position) as CompareResult
  )
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
    const range_search = this.ldoc_bst.create_range_search()
    range_search.lesser_find_greatest = true
    range_search.greater_find_least = true
    range_search.push_point({ known_position: start }, '_lesser', false)
    range_search.all_greater('_greater')
    const { _lesser, _greater } = this.ldoc_bst.search(range_search)

    let lesser: ConflictGroup
    let greater: ConflictGroup
    if (_lesser && _lesser.length) {
      // The earliest one will not be a only a removal if nodes are ordered
      // properly. We can ignore the removals in between
      lesser = _lesser.sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0]
    }
    if (_greater && _greater.length) {
      // Now grab the last element...
      greater = _greater.sort((a, b) => b.logoot_start.cmp(a.logoot_start))[0]
    }

    let before_position
    let after_position

    const lesser_length = lesser ? lesser.ldoc_length : 0
    if (lesser && lesser.known_position + lesser_length === start) {
      if (
        greater &&
        lesser.last_branch === greater.first_branch &&
        lesser.last_branch !== this.branch
      ) {
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
          const range_search = this.ldoc_bst.create_range_search()
          range_search.lesser_find_greatest = true
          range_search.push_point(
            { known_position: lesser.known_position },
            '_lesser',
            false
          )
          const { _lesser } = this.ldoc_bst.search(range_search)

          let most_lesser
          if (_lesser && _lesser.length) {
            most_lesser = _lesser.sort((a, b) =>
              a.logoot_start.cmp(b.logoot_start)
            )[0]
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
    const range_search = this.ldoc_bst.create_range_search()
    range_search.lesser_find_greatest = true
    range_search.greater_find_least = true
    range_search.push_point({ known_position: start }, '_lesser', false)
    range_search.push_point({ known_position: start + length }, '_range', false)
    range_search.all_greater(undefined)
    const { _lesser, _range } = this.ldoc_bst.search(range_search)

    const nodes = _range || []
    if (_lesser && _lesser.length) {
      // The earliest one will not be a only a removal if nodes are ordered
      // properly. We can ignore the removals in between
      const l = _lesser.sort((a, b) => a.logoot_start.cmp(b.logoot_start))[0]
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
    const level = nstart.levels
    const nend = nstart.offsetLowest(length)

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
    const skip_ranges = _skip_ranges
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
      const lesser_end = lesser.splitAround(
        nstart
          .level(lesser.start.levels)
          .sub(lesser.start.level(lesser.start.levels)).js_int
      )
      skip_ranges.push(lesser_end)
    } else if (greater) {
      skip_ranges.push(greater)
    }

    // Ensure that there's something at the end of the list so that it will
    // always run regardless and if there are nodes, that there is always a node
    // last in the array at the end position
    if (
      !skip_ranges.length ||
      skip_ranges[skip_ranges.length - 1].end.cmp(nend) < 0
    ) {
      const vgroup = new LogootNodeGroup()
      vgroup.start = nend
      skip_ranges.push(vgroup)
    }

    // Keep track of all the conflict groups we're automatically modifying
    let conflict_order: ConflictGroup[] = []
    skip_ranges.forEach(({ group }) => {
      if (
        group &&
        !conflict_order.includes(group) &&
        group.branch_order.length
      ) {
        conflict_order.push(group)
      }
    })
    conflict_order = conflict_order.sort(
      (a, b) => a.known_position - b.known_position
    )

    const original_known_end = conflict_order.length
      ? conflict_order[conflict_order.length - 1].ldoc_end
      : 0

    // Track all the operations that have been performed and the offset that
    // should be placed on nodes after this one. This will modify the nodes
    // in `conflict_order`
    const operations: Operation[] = []
    let known_position_shift = 0
    const applyShift = (
      cg: ConflictGroup,
      start: number,
      length: number,
      ic: boolean
    ): void => {
      known_position_shift += length

      // Record the Logoot start of this new CG
      const lstart = cg.logoot_start
      for (let i = conflict_order.length - 1; i > 0; i--) {
        const n = conflict_order[i]
        // Bail out if we've passed our position
        if (ic) {
          if (n.known_position < start || n.logoot_start.cmp(lstart) < 0) {
            return
          }
        } else {
          if (n.known_position <= start || n.logoot_start.cmp(lstart) <= 0) {
            return
          }
        }
        // Add to the known_position, ignoring the current node
        if (n !== cg) {
          conflict_order[i].known_position += length
        }
      }
    }
    const remove = (cg: ConflictGroup, start: number, length: number): void => {
      if (length === 0) {
        return
      }
      operations.push({
        type: 'r',
        start,
        length
      })
      applyShift(cg, start, -length, true)
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
      applyShift(cg, start, length, true)
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
      const ncg = new ConflictGroup(cg.ldoc_end)

      let known_position = cg.known_position
      const known_end = ncg.known_position
      cg.branch_order.forEach((br) => {
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

        ncg.branch_order.push(br)

        const moved_length = cg.branchLength([br]) - excerpt_length

        ncg.known_position -= moved_length
        known_position += excerpt_length
        translate(known_position, moved_length, known_end - moved_length)
      })

      ncg.groups = cg.groups.splice(cg.groups.indexOf(ng) + 1, cg.groups.length)
      ncg.groups.forEach((group) => (group.group = ncg))

      this.ldoc_bst.add(ncg)
      conflict_order.splice(conflict_order.indexOf(cg) + 1, 0, ncg)

      return ncg
    }
    // Join a conflict group and translate the child nodes
    const joinCg = (lcg: ConflictGroup, ncg: ConflictGroup): void => {
      ncg.branch_order.forEach((br) => {
        if (!lcg.branch_order.includes(br)) {
          lcg.branch_order.push(br)
        }
      })

      ncg.groups.forEach((group) => (group.group = lcg))
      lcg.groups.splice(lcg.groups.length, 0, ...ncg.groups)

      let fetch_position = ncg.known_position
      let known_position = lcg.known_position
      ncg.branch_order.forEach((br) => {
        known_position += lcg.branchLength([br])
        const next_length = ncg.branchLength([br])
        translate(fetch_position, next_length, known_position - next_length)
        fetch_position += next_length
      })

      ncg.branch_order.length = 0
      ncg.groups = []
      // Ensure that we remove **only** this node from the BST
      this.ldoc_bst.remove(ncg, (other) => other === ncg)
      conflict_order.splice(conflict_order.indexOf(ncg), 1)
    }

    let last_start = nstart.level(level)
    let last_group = lesser
    skip_ranges.forEach((group, i) => {
      // Can be reassigned when nodes are split
      let next_group = skip_ranges[i + 1]

      const group_level_start = group.start.clamp(nstart, nend, level).l(level)
      const group_level_end = group.end.clamp(nstart, nend, level).l(level)

      const empty_length = group_level_start.copy().sub(last_start).js_int
      const empty_offset = last_start.copy().sub(nstart.l(level)).js_int

      if (empty_length > 0) {
        const newgroup = new LogootNodeGroup()
        newgroup.start = nstart.copy()
        newgroup.start.l(level).assign(last_start)
        newgroup.length = empty_length
        newgroup.br(br, { type, rclk: nrclk })

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
            last_group ? last_group.group.ldoc_end : 0
          )
          newgroup.group.branch_order.push(br)
          this.ldoc_bst.add(newgroup.group)
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
          insert(
            newgroup.group,
            newgroup.group.insertSingleBranchGroup(newgroup),
            empty_offset,
            newgroup.length
          )
        } else {
          newgroup.group.insertSingleBranchGroup(newgroup)
        }

        last_group = newgroup
        this.logoot_bst.add(newgroup)
      }

      const group_length = group_level_end.copy().sub(group_level_start).js_int
      const group_offset = group_level_start.copy().sub(nstart.l(level)).js_int
      if (
        group.start.levels === level &&
        group_length > 0 &&
        (!group.br(br) || nrclk.cmp(group.br(br).rclk) > 0)
      ) {
        // Split off the trailing start
        if (group.start.cmp(nstart) < 0) {
          last_group = group
          group = group.splitAround(
            nstart.l(level).sub(group.start.l(level)).js_int
          )
          this.logoot_bst.add(group)
        }
        // Split off the trailing end
        if (group.end.cmp(nend) > 0) {
          const newgroup = group.splitAround(
            group.end.l(level).sub(nend.l(level)).js_int
          )
          this.logoot_bst.add(newgroup)
          next_group = newgroup
        }

        // Ensure that this group is in the branch order
        if (!group.group.branch_order.includes(br)) {
          group.group.branch_order.push(br)
        }

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

    conflict_order.forEach(({ known_position, ldoc_length, conflicted }) => {
      mark(known_position, ldoc_length, conflicted)
    })

    // Now, update all nodes after the ones in conflict_order
    this.ldoc_bst.operateOnAllGteq(
      { known_position: original_known_end },
      ({ data }) => {
        if (!data.groups.length) {
          throw new FatalError('An empty conflict group was found in the BST')
        }
        if (data.logoot_start.cmp(nend) < 0) {
          return
        }
        if (!conflict_order.includes(data)) {
          data.known_position += known_position_shift
        }
      }
    )

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
      new LogootInt(rclk).add(1),
      NodeType.REMOVAL,
      this.canJoin
    )
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
