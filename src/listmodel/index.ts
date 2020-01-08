import { arraymap, FatalError, CompareResult } from '../utils'
import { debug } from '../debug'
import { Bst } from '../bst'

import {
  LogootInt,
  LogootPosition,
  LogootNode,
  DataLogootNode,
  LogootNodeWithMeta,
  ConflictGroup,
  LogootNodeGroup,
  BranchKey
} from './logoot'

type Removal = { start: LogootPosition; length: number }

type KnownPositionBst = Bst<DataLogootNode, { known_position: number }>
type LogootBst = Bst<LogootNodeGroup, { start: LogootPosition }>

type Conflict = {
  start: LogootPosition
  end: LogootPosition
  clip_nstart: boolean
  clip_nend: boolean
  whole_node: boolean
  level: number
}
type Merge = {
  position: LogootPosition
  rclk: LogootInt
  length: number
  branch: BranchKey
  drop: boolean
}

class InsertionConflictError extends Error {}

/**
 * This is possibly the most important function in this entire program. The
 * role of this function is to determine which parts of a node will have
 * precedence over nodes currently in a Logoot binary search tree. Any new
 * node must be filtered to determine which parts can actually make it into
 * the document. For example, if there is a node with a higher `rclk`
 * currently in the BST, that portion that overlaps with the node must be cut
 * out. If the reverse is true, the node must be removed. This is done by
 * first filtering the nodes in the region in question using a user-defined
 * priority function. Nodes are either kept, ignored, or removed. These nodes
 * are then used as regions of the input to skip over (variable named
 * `skip_ranges`) and the resulting node(s) are returned.
 *
 * @param bst - The binary search tree containing current nodes to consider
 * @param nstart - The start of the region in question
 * @param length - The length of the region in question
 * @param resolveConflict - A callback function determining what happens to a
 * node currently in the BST in the region in question. If it returns 1, the
 * node is kept. If it is 0, the node is ignored and is not skipped over. If
 * it is -1, the section in question of the node is removed and the
 * `informRemoval` function is called so further removals can be performed.
 * @param addNode - A function only called when a node is split into pieces
 * and additional nodes must be added as side-effects of the operation.
 * @param informRemoval - A function to be called when a section or all of a
 * node is removed so that the caller can modify the document as necessary.
 */
/* function _mergeNode(
  bst: LogootBst,
  nstart: LogootPosition,
  length: number,
  addNode: (node: LogootNode) => void,
  informRemoval: (
    group: LogootNodeGroup,
    branch: BranchKey,
    pos: number,
    length: number,
    whole: boolean
  ) => void,
  rclk: LogootInt,
  branch: BranchKey = this.branch
): LogootNodeWithMeta[] {
  const level = nstart.levels
  const nend = nstart.offsetLowest(length)

  // These ranges are areas of the document that are already populated in the
  // region where the insert is happening. If there are conflicts, they will be
  // skipped. The end of this new insert must be added to the end as a fake
  // zero-length node so that the for each loop triggers for the end.
  let skip_ranges = bst
    .getRange({ start: nstart }, { start: nend })
    .map(({ data }) => data)
    .sort((a, b) => a.start.cmp(b.start))

  const nodes_lesser = bst.getLteq({ start: nstart })
  let lesser: LogootNodeGroup
  if (nodes_lesser.length > 1) {
    throw new FatalError('Corrupt BST. There are multiple nodes at a position.')
  } else if (nodes_lesser.length) {
    lesser = nodes_lesser[0].data
  }

  // Ensure that lesser is initially defined as a skip_range (this is useful for
  // some removals that may want to use conflicts with lesser
  if (lesser && !skip_ranges.includes(lesser)) {
    skip_ranges.unshift(lesser)
  }
  // Create an imaginary group to make sure the skip_ranges function actually
  // runs when there are no nodes
  const skip_range_vgrp = new LogootNodeGroup()
  skip_range_vgrp.start = nend
  skip_ranges.push(skip_range_vgrp)

  arraymap(skip_ranges, (ng) => {
    if (ng.length && ng.start.levels === level) {
      const clip_nstart = nstart.cmp(ng.start) > 0
      const clip_nend = nend.cmp(ng.end) < 0
      const start = clip_nstart ? nstart : ng.start
      const end = clip_nend ? nend : ng.end
      if (start.cmp(end) === 0) {
        return [ng]
      }
      if (clip_nstart) {
        ng = ng.split_around(nstart.l(level) - ng.start.l(level))
        addNode(ng)
      }
      if (clip_nend) {
        const newgroup = ng.split_around(ng.end.l(level) - nend.l(level))
        addNode(newgroup)
      }

      const branches = ng.br(branch).br_merged_into
      ng.br(branch).br_merged_into.forEach({ branch, at_rclk }) => {
        if (at_rclk.cmp(rclk) >= 0 && rclk.cmp(ng.br(branch).rclk) >= 0) {
          
        } else {
        }
      })
    }
    return [ng]
  })

  let known_start = 0
  if (lesser) {
    const positions = [lesser.length]
    // Find where we are inside lesser. If we're outside of lesser, this will be
    // greater than lesser's length and will be ignored
    if (lesser.start.levels < nstart.levels) {
      positions.push(
        new LogootInt(nstart.l(lesser.start.levels)).sub(
          lesser.start.l(lesser.start.levels)
        ).js_int
      )
    }

    // Figure out which endpoint to use, the end of lesser or where our position
    // is if its inside lesser
    const lesser_pos = Math.min(...positions) // Position inside of lesser
    known_start = lesser.known_position + lesser_pos

    // Split lesser in two if necessary. If our position inside lesser is
    // greater than the length, we're not inside lesser. If it's less, then we
    // are and we have to split lesser
    if (lesser.length > lesser_pos) {
      const node = new LogootNode(lesser)
      node.start = node.start.offsetLowest(lesser_pos)
      node.length -= lesser_pos
      node.known_position += lesser_pos
      addNode(node)

      lesser.length = lesser_pos
    }
  }

  const newnodes: LogootNodeWithMeta[] = []
  // We fake the last node end to be the start of the new node because the
  // inserted text always needs to 'snap' to the end of the last node,
  // regardless of discontinuities in Logoot positions
  let last_end = nstart
  let last_known_position = known_start
  skip_ranges.forEach((skip_range) => {
    const { start, end, length } = skip_range
    // Clamped regions to consider. Anything outside of the node to be inserted
    // doesn't matter, so we clamp it out
    // Of course, that means we have to recalculate EVERYTHING *sigh*
    const cstart = start.equivalentPositionAtLevel(level).clamp(nstart, nend)
    const cend = end.equivalentPositionAtLevel(level).clamp(nstart, nend)

    // Now, find the offset in our body string
    const offset = new LogootInt(last_end.l(level)).sub(nstart.l(level)).js_int

    const node: LogootNodeWithMeta = Object.assign(new LogootNode(), {
      offset
    })
    // Find the new node length by finding the distance between the last end
    // and the next one
    node.length = new LogootInt(cstart.l(level)).sub(last_end.l(level)).js_int

    if (node.length <= 0) {
      last_end = cend
      if (skip_range !== lesser) {
        last_known_position += length
      }
      return
    }

    node.start = nstart.offsetLowest(offset)
    node.known_position = last_known_position

    newnodes.push(node)

    last_end = cend
    last_known_position += node.length
    if (skip_range !== lesser) {
      // When incrementing the known_position, we ALWAYS use the length of the
      // whole node since we will have to skip over the node regardless of how
      // much of it actually concerns the node being added
      // For example, if we're adding a node around an existing node with a
      // greater number of levels, it will have the length of zero on our
      // current level (because it is between two positions), but we still
      // MUST skip over its entire non-zero length
      last_known_position += length
    }
  })
  return newnodes
} */

function _mergeNode(
  bst: LogootBst,
  nstart: LogootPosition,
  length: number,
  rclk: LogootInt,
  branch: BranchKey,
  informRemoval: (
    group: LogootNodeGroup,
    branch: BranchKey,
    pos: number,
    length: number,
    whole: boolean
  ) => void,
  canMerge: (
    a: LogootNodeGroup,
    b: LogootNodeGroup
  ) => boolean
): void {
  const level = nstart.levels
  const nend = nstart.offsetLowest(length)

  // These ranges are areas of the document that are already populated in the
  // region where the insert is happening. If there are conflicts, they will be
  // skipped. The end of this new insert must be added to the end as a fake
  // zero-length node so that the for each loop triggers for the end.
  const skip_ranges = bst
    .getRange({ start: nstart }, { start: nend })
    .map(({ data }) => data)
    .sort((a, b) => a.start.cmp(b.start))

  const nodes_lesser = bst.getLteq({ start: nstart })
  let lesser: LogootNodeGroup
  if (nodes_lesser.length > 1) {
    throw new FatalError('Corrupt BST. There are multiple nodes at a position.')
  } else if (nodes_lesser.length) {
    lesser = nodes_lesser[0].data
  }

  // Ensure that lesser is initially defined as a skip_range (this is useful for
  // some removals that may want to use conflicts with lesser
  if (lesser && !skip_ranges.includes(lesser)) {
    skip_ranges.unshift(lesser)
  }

  let known_start = 0
  if (lesser) {
    const positions = [lesser.length]
    // Find where we are inside lesser. If we're outside of lesser, this will be
    // greater than lesser's length and will be ignored
    if (lesser.start.levels < nstart.levels) {
      positions.push(
        new LogootInt(nstart.l(lesser.start.levels)).sub(
          lesser.start.l(lesser.start.levels)
        ).js_int
      )
    }

    // Figure out which endpoint to use, the end of lesser or where our position
    // is if its inside lesser
    const lesser_pos = Math.min(...positions) // Position inside of lesser
    known_start = lesser.known_position + lesser_pos

    // Split lesser in two if necessary. If our position inside lesser is
    // greater than the length, we're not inside lesser. If it's less, then we
    // are and we have to split lesser
    if (lesser.length > lesser_pos) {
      const node = new LogootNode(lesser)
      node.start = node.start.offsetLowest(lesser_pos)
      node.length -= lesser_pos
      node.known_position += lesser_pos
      addNode(node)

      lesser.length = lesser_pos
    }
  }
  // Ensure that lesser (which we now know does not overlap with our new
  // positions) is in the skip_ranges
  skip_ranges.unshift(lesser)

  const ranges = []

  let last_end = nstart
  let last_known_position = known_start
  let last_group: LogootNodeGroup = lesser
  skip_ranges.forEach((ng) => {
    const clamped_start = ng.start.clamp(nstart, nend, level)
    const cl
    const empty_len = (ng.start.l(level) || new LogootInt(0)).sub(
      last_end.l(level)
    ).js_int
    if (empty_len > 0) {
      ranges.push({
        start: last_end,
        length: empty_len,
        group: undefined
      })
    }

    last_group = ng
  })
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
   * See the Logoot paper for why. Unlike the Logoot implementation, this is
   * incremented with each removal only and is kept constant with insertions.
   */
  vector_clock = new LogootInt()
  branch: BranchKey

  constructor(branch: BranchKey) {
    this.branch = branch
  }

  _splitGroup(group: LogootNodeGroup, pos: number): LogootNodeGroup {
    const newgroup = group.split_around(pos)

    newgroup.each_node((n) => {
      if (n instanceof DataLogootNode) {
        this.ldoc_bst.add(n as DataLogootNode)
      }
    })
    this.logoot_bst.add(newgroup)
    return newgroup
  }

  /**
   * Calculate the Logoot positions of a local insertion.
   * @param position - The index of new text
   * @param len - How much will be inserted
   * @returns A Logoot insertion with a Logoot position (`start`), a vector
   * clock value (`rclk`) (**copied** from the document), and the length passed
   * to the function (`length`). Note that the start position is **not** copied,
   * so if it is modified, it will mess up the sorting trees. Ensure that it is
   * copied before modifying it.
   * @throws {FatalError} Will throw in the event that internal corruption is
   * encountered. If this happens, please submit an issue.
   * @throws {Error} Will throw in the event that the position being inserted is
   * after the end of the known document model.
   */
  insertLocal(
    position: number,
    len: number
  ): { position: LogootPosition; rclk: LogootInt; length: number } {
    debug.debug(`Insert into doc at ${position} + ${len}`)

    // The position must be -1 for lesser because it can't count the text node
    // currently in the insertion position (we're between two nodes)
    const nodes_lesser = this.ldoc_bst.getLteq({ known_position: position - 1 })
    const nodes_greater = this.ldoc_bst.getGteq({ known_position: position })

    let lesser // The node before this position
    let greater // The node after this position

    // Nodes are not allowed to have the same position
    if (nodes_lesser.length > 1 || nodes_greater.length > 1) {
      throw new FatalError(
        'Corrupt BST. There are multiple nodes at a position.'
      )
    } else {
      lesser = nodes_lesser[0] ? nodes_lesser[0].data : undefined
      greater = nodes_greater[0] ? nodes_greater[0].data : undefined
    }

    if (lesser && lesser.known_end_position < position) {
      throw new Error('Position cannot be added after the end of the document.')
    }

    if (lesser && lesser.length + lesser.known_position > position) {
      // This means that we're right inside another node, so the next position
      // will be inside the first node
      // Now, we must split the node in half (nodes can't overlap)
      const branch = lesser.branch
      greater = this._splitGroup(
        lesser.group,
        position - lesser.known_position
      ).br(branch)
    }

    // Finally, we can create positions...
    let left_position
    let right_position

    if (
      lesser &&
      greater &&
      lesser.group === greater.group &&
      lesser.group.conflicted
    ) {
      if (lesser.branch === this.branch) {
        greater = undefined
        const greater_group = this.logoot_bst.getGteq({ start: lesser.end })
        if (greater_group.length > 1) {
          throw new FatalError(
            'Corrupt BST. There are multiple nodes at a position.'
          )
        }
        right_position = greater_group[0].data.start
      } else if (greater.branch === this.branch) {
        lesser = undefined
        const lesser_group = this.logoot_bst.getLteq({ start: greater.start })
        if (lesser_group.length > 1) {
          throw new FatalError(
            'Corrupt BST. There are multiple nodes at a position.'
          )
        }
        left_position = lesser_group[0].data.start
      } else {
        throw new InsertionConflictError('Cannot insert into conflicting node')
      }
    }

    if (lesser) {
      left_position = lesser.end
    }
    if (greater) {
      right_position = greater.start
    }

    const group = new LogootNodeGroup()
    group.start = new LogootPosition(len, left_position, right_position)
    group.length = len

    const node = new DataLogootNode({ group, branch: this.branch })
    node.known_position = position
    node.rclk = new LogootInt(this.vector_clock)

    // Now, make a space between the nodes
    this.ldoc_bst.operateOnAllGteq({ known_position: position }, (n) => {
      n.data.known_position += len
    })

    this.ldoc_bst.add(node)
    this.logoot_bst.add(group)

    return {
      position: node.start,
      rclk: new LogootInt(this.vector_clock),
      length: len
    }
  }

  /**
   * Calculate the Logoot positions and lengths of removals from a removal in
   * the local document.
   * @param position - The index of old text
   * @param length - The length text that will be removed
   * @returns An object containing an array of removals and the calculated
   * vector clock. Each removal contains a `start` LogootPosition, which is not
   * copied, so it **cannot be modified**, and a numeric `length`.
   */
  removeLocal(
    position: number,
    length: number
  ): { removals: Removal[]; merges: Merge[]; rclk: LogootInt } {
    debug.debug(`Remove from doc at ${position} + ${length}`)

    // First, find any nodes that MAY have content removed from them
    const nodes = this.ldoc_bst
      .getRange(
        { known_position: position },
        { known_position: position + length - 1 }
      )
      .concat(this.ldoc_bst.getLteq({ known_position: position - 1 }))
      .sort((a, b) => a.data.known_position - b.data.known_position)

    const merges: Merge[] = []
    let last_merge_end: LogootPosition

    const removals: Removal[] = []
    let last_end: LogootPosition // End of the previous removal

    let cumulative_offset = 0 // How much to shift over nodes
    nodes.forEach(({ data }) => {
      // 'Data' refers to the node having text removed
      const { branch } = data
      let { group } = data

      // Length and start of the new removal
      let newlen = data.length
      let newstart = data.start

      // Remove the ends of the node not being removed
      if (data.known_position < position) {
        newlen -= position - data.known_position
        newstart = newstart.offsetLowest(position - data.known_position)
      }
      if (data.known_position + data.length > position + length) {
        newlen -= data.known_position + data.length - (position + length)
      }

      if (newlen <= 0) {
        return
      }

      // Add the removal to the last one if possible
      if (last_end && last_end.cmp(newstart) === 0) {
        removals[removals.length - 1].length += newlen
      } else {
        removals.push({
          start: newstart,
          length: newlen
        })
      }
      last_end = newstart.offsetLowest(newlen)
      if (group.br(this.branch) && group.n_branches > 1) {
        if (
          last_merge_end &&
          last_merge_end.cmp(newstart) === 0 &&
          merges[merges.length - 1].branch === branch &&
          merges[merges.length - 1].rclk.cmp(data.rclk) === 0
        ) {
          merges[merges.length - 1].length += newlen
        } else {
          merges.push({
            position: newstart,
            length: newlen,
            rclk: data.rclk,
            branch,
            drop: true
          })
        }
        last_merge_end = last_end
      }

      // First, seperate the overhanging start
      if (data.known_position < position) {
        const newgroup = this._splitGroup(group, position - data.known_position)

        if (group.br(branch) instanceof DataLogootNode) {
          const br = group.br(branch) as DataLogootNode
          br.known_position -= cumulative_offset
        } else {
          throw new Error(
            'Split node is not of the same type. This should be impossible.'
          )
        }

        group = newgroup
        // Switch to our middle region (we've already typechecked the branch)
        data = group.br(branch) as DataLogootNode
      }
      // Add the new removal offset since we're now after the removal
      cumulative_offset += newlen
      // Next, seperate the overhanging end
      if (data.known_position + data.length > position + length) {
        const newgroup = this._splitGroup(group, data.known_position + newlen)
        if (group.br(branch) instanceof DataLogootNode) {
          const br = newgroup.br(branch) as DataLogootNode
          br.known_position -= cumulative_offset
        } else {
          throw new Error(
            'Split node is not of the same type. This should be impossible.'
          )
        }
      }

      this.ldoc_bst.remove(data)
      group.del_br(branch)
      if (!group.n_branches) {
        this.logoot_bst.remove(group)
      }
    })

    // Offset the nodes that come after the removal
    this.ldoc_bst.operateOnAllGteq(
      { known_position: position + length },
      (n) => {
        n.data.known_position -= length
      }
    )

    const target_rclk = new LogootInt(this.vector_clock)
    this.vector_clock.add(1)

    return { removals, merges, rclk: target_rclk }
  }
}

export {
  LogootInt,
  LogootPosition,
  KnownPositionBst,
  LogootBst,
  Removal,
  ListDocumentModel // ,
  // _mergeNode
}
