import { arraymap, FatalError, CompareResult } from '../utils'
import { debug } from '../debug'
import { Bst } from '../bst'

import {
  LogootInt,
  LogootPosition,
  LogootNode,
  LogootNodeWithMeta
} from './logoot'

type Removal = { start: LogootPosition; length: number }

type KnownPositionBst = Bst<LogootNode, { known_position: number }>
type LogootBst = Bst<LogootNode, { start: LogootPosition }>

type Conflict = {
  start: LogootPosition
  end: LogootPosition
  clip_nstart: boolean
  clip_nend: boolean
  whole_node: boolean
  level: number
}

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
function _mergeNode(
  bst: LogootBst,
  nstart: LogootPosition,
  length: number,
  resolveConflict: (
    node: LogootNode,
    conflict: Conflict,
    lesser: LogootNode
  ) => CompareResult,
  addNode: (node: LogootNode) => void,
  informRemoval: (
    node: LogootNode,
    pos: number,
    length: number,
    whole: boolean
  ) => void
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
  let lesser: LogootNode
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
  // It's fine that known_position is invalid because that would only impact
  // nodes AFTER this one (whose calculations depend upon it)
  skip_ranges.push({
    start: nend,
    end: nend,
    length: 0,
    known_position: 0,
    known_end_position: 0,
    rclk: new LogootInt(0)
  })

  skip_ranges = skip_ranges.filter((n) => {
    if (n.length && n.start.levels === level) {
      const clip_nstart = nstart.cmp(n.start) > 0
      const clip_nend = nend.cmp(n.end) < 0
      const start = clip_nstart ? nstart : n.start
      const end = clip_nend ? nend : n.end
      if (start.cmp(end) === 0) {
        return true
      }
      const conflict = {
        start,
        end,
        clip_nstart,
        clip_nend,
        whole_node: !(clip_nstart || clip_nend),
        level
      }

      // Get the externally defined result for this conflict
      const result = resolveConflict(n, conflict, lesser)

      // Actually remove the node or part of it if it looses
      if (result < 1) {
        if (result < 0) {
          // Shortcut to remove the whole node
          if (conflict.whole_node) {
            informRemoval(n, n.known_position, n.length, true)
            n.length = 0
          } else {
            // Find the length of the middle region of the node
            // nnnnnRRRRnnnn <- Where the 'R' is (l=4 in this case)
            const l = new LogootInt(end.l(level)).sub(start.l(level)).js_int

            // Make a copy because we will need to modify the original
            const endnode = new LogootNode(n)
            endnode.start = end
            const n_end_old = n.end.offsetLowest(0)

            if (clip_nstart) {
              // This means we're dealing with an area ahead of the node with a
              // length > 0:
              // NNNNrrrrrnnnnn (As above, 'r' is the section of the node being
              // removed)
              n.length = new LogootInt(start.l(level)).sub(
                n.start.l(level)
              ).js_int

              endnode.known_position += n.length
              endnode.start.offsetLowest(n.known_position + n.length + l)
              informRemoval(n, n.known_position + n.length, l, n.length <= 0)
            } else {
              // The removal must be right up against the edge of the node,
              // so we can take an easy shortcut:
              // RRRRnnnnnn
              informRemoval(n, n.known_position, l, true)
              endnode.start.offsetLowest(n.known_position + l)
            }
            if (clip_nend) {
              // Ok, so now we have to add a new node to account for the
              // trailing end portion: [nnnn]rrrrNNNNN <- that
              // We also have to re-add it to the BSTs because they are sorted
              // by start position, so if we modify the start, we could break
              // the sorting
              endnode.length = new LogootInt(n_end_old.l(level)).sub(
                end.l(level)
              ).js_int
              if (endnode.length > 0) {
                addNode(endnode)
              }
            }
          }
        }
        return false
      }
    }
    return true
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
    const lesser_pos = Math.min(...positions)
    known_start = lesser.known_position + lesser_pos

    // Split lesser in two if necessary
    if (lesser.length - lesser_pos) {
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
  removal_bst: LogootBst = new Bst((a, b) => a.start.cmp(b.start))
  /**
   * See the Logoot paper for why. Unlike the Logoot implementation, this is
   * incremented with each removal only and is kept constant with insertions.
   */
  vector_clock = new LogootInt()

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

    let lesser
    let greater

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
      greater = new LogootNode()

      greater.length = lesser.known_end_position - position
      lesser.length = position - lesser.known_position

      greater.known_position = position
      greater.start = lesser.start.offsetLowest(lesser.length)
      greater.rclk = new LogootInt(lesser.rclk)

      this.ldoc_bst.add(greater)
      this.logoot_bst.add(greater)
    }

    // Finally, we can create positions...
    let left_position
    let right_position

    if (lesser) {
      left_position = lesser.end
    }
    if (greater) {
      right_position = greater.start
    }

    const node = new LogootNode()
    node.start = new LogootPosition(len, left_position, right_position)
    node.known_position = position
    node.rclk = new LogootInt(this.vector_clock)
    node.length = len

    // Now, make a space between the nodes
    this.ldoc_bst.operateOnAllGteq({ known_position: position }, (n) => {
      n.data.known_position += len
    })

    this.ldoc_bst.add(node)
    this.logoot_bst.add(node)

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
  ): { removals: Removal[]; rclk: LogootInt } {
    debug.debug(`Remove from doc at ${position} + ${length}`)

    // First, find any nodes that MAY have content removed from them
    const nodes = this.ldoc_bst
      .getRange(
        { known_position: position },
        { known_position: position + length - 1 }
      )
      .concat(this.ldoc_bst.getLteq({ known_position: position - 1 }))
      .sort((a, b) => a.data.known_position - b.data.known_position)

    const removals: Removal[] = []
    let last_end: LogootPosition
    let cumulative_offset = 0
    nodes.forEach(({ data }) => {
      // 'Data' refers to the node having text removed

      // Length and start of new removal
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

      // Record the last end so we can add another removal to it if possible
      last_end = newstart.offsetLowest(newlen)

      // Now, modify the node to remove the start region (if necessary)
      if (data.known_position > position) {
        data.start = data.start.offsetLowest(data.known_position - position)
      }
      // And remove the removal inside of it
      data.length -= newlen

      // Now apply the running total offset and calculate it for the next run
      data.known_position -= cumulative_offset
      cumulative_offset += newlen

      if (data.length <= 0) {
        this.logoot_bst.remove(data)
        this.ldoc_bst.remove(data)
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

    return { removals, rclk: target_rclk }
  }

  /**
   * Calculate the local positions inserted from an insertion at a Logoot
   * position from a given length and vector clock.
   * @param nstart - The start `LogootPosition` of the insertion
   * @param length - The length of the insertion
   * @param this_rclk - The vector clock when the insertion took place.
   * @returns An object with the `insertions` member set to an array with
   * objects containing a numeric `offset`, which represents which part of the
   * source string the insertion is pulling from, a numeric `length`, and a
   * numeric `known_position` where to place the string. Insertions must be
   * applied in the order of the return value.
   */
  insertLogoot(
    nstart: LogootPosition,
    length: number,
    this_rclk: LogootInt
  ): {
    insertions: { offset: number; length: number; known_position: number }[]
  } {
    debug.debug(
      `Insert into doc at ${nstart.toString()} + ${length} @ ${this_rclk.toString()}`
    )

    if (this_rclk.cmp(this.vector_clock) > 0) {
      this.vector_clock = this_rclk
      debug.info(`Fast-forward vector clock to ${this_rclk.toString()}`)
    }

    const nodes = _mergeNode(
      this.logoot_bst,
      nstart,
      length,
      (node, conflict, lesser) => {
        // If we're inside and on a lower level than lesser, simply ignore it
        if (node === lesser && lesser.start.levels < conflict.level) {
          return 0
        }
        if (node.rclk.cmp(this_rclk) < 0) {
          return -1
        }
        if (node.rclk.cmp(this_rclk) === 0) {
          // TODO: Do something about conflicts that cause dropped data here
          // This is HUGE and the editor WILL NOT FUNCTION WITHOUT IT!!!
          // I really don't like the idea of pushing this until after initial
          // release, but oh well.
          // Also, does this even work?
          debug.info('Dropped conflicting node')
        }
        return 1
      },
      (node) => {
        // We don't add to the known_position here because the node we're adding
        // comes from splitting an existing node
        this.ldoc_bst.add(node)
        this.logoot_bst.add(node)
      },
      (node, pos, length, whole) => {
        if (whole) {
          this.ldoc_bst.remove(node)
          this.logoot_bst.remove(node)
        }
        this.removeLocal(pos, length)
        this.ldoc_bst.operateOnAllGteq({ known_position: pos }, (n) => {
          if (n.data === node) {
            return
          }
          n.data.known_position -= length
        })
      }
    )

    arraymap(nodes, (node) => {
      let last_known_position = node.known_position
      return _mergeNode(
        this.removal_bst,
        node.start,
        node.length,
        (node) => {
          if (node.rclk.cmp(this_rclk) < 0) {
            return 0
          }
          return 1
        },
        () => {},
        () => {}
      ).map((newnode) => {
        // known_positions in the removal tree are BS, so set them correctly
        // here. TODO: Remove known_position from removals
        newnode.known_position = last_known_position
        newnode.offset += node.offset
        last_known_position += newnode.length
        return newnode
      })
    })

    const insertions: {
      offset: number
      length: number
      known_position: number
    }[] = []

    nodes.forEach((node) => {
      node.rclk = this_rclk
      // Now, make a space between the nodes
      this.ldoc_bst.operateOnAllGteq(node, (n) => {
        if (n.data === node) {
          return
        }
        n.data.known_position += node.length
      })

      const insertion = {
        known_position: node.known_position,
        offset: node.offset,
        length: node.length
      }
      insertions.push(insertion)

      this.ldoc_bst.add(node)
      this.logoot_bst.add(node)
    })

    return { insertions }
  }

  /**
   * Calculate the regions of text to be removed from the local document from
   * a Logoot position, length, and vector clock of a removal.
   * @param start - The start at which to start removing.
   * @param length - How much to remove.
   * @param rclk - The vector clock of the removal.
   * @returns An object containing a member `removals`, which is an array of
   * objects containing a `known_position` at which to start removing and a
   * `length`, both of which are numbers.
   */
  removeLogoot(
    start: LogootPosition,
    length: number,
    rclk: LogootInt
  ): { removals: { known_position: number; length: number }[] } {
    const new_rclk = new LogootInt(rclk).add(1)
    if (new_rclk.cmp(this.vector_clock) > 0) {
      this.vector_clock = new_rclk
      debug.info('Fast-forward vector clock to', JSON.stringify(new_rclk))
    }

    const end = start.offsetLowest(length)
    // The level where our removal is happening (always the lowest)
    const level = start.levels
    debug.debug(
      `Remove from doc at ${start.toString()} + ${length} @ ${rclk.toString()}`
    )

    const removals: { known_position: number; length: number }[] = []
    // This is basically the same as the invocation in remoteInsert, only it
    // doesn't add the resulting nodes to the BSTs
    const nodes = _mergeNode(
      this.logoot_bst,
      start,
      length,
      (node) => {
        // TODO: Nodes with the SAME `rclk` should still have a removal added
        // at their position because another node with the same `rclk` as the
        // one just removed could show up.
        if (node.rclk.cmp(rclk) <= 0) {
          return -1
        }
        return 1
      },
      (node) => {
        this.ldoc_bst.add(node)
        this.logoot_bst.add(node)
      },
      (node, pos, length, whole) => {
        if (whole) {
          this.ldoc_bst.remove(node)
          this.logoot_bst.remove(node)
        }
        removals.push({ known_position: pos, length })
        this.ldoc_bst.operateOnAllGteq({ known_position: pos }, (n) => {
          if (n.data === node) {
            return
          }
          n.data.known_position -= length
        })
      }
    )

    // Now, use the text nodes that stay as `skip_ranges`, like in the
    // `_mergeNode` function, to find where the removal should be added to the
    // removal BST
    nodes.push({
      start: end,
      end,
      length: 0,
      known_position: 0,
      known_end_position: 0,
      rclk: new LogootInt(),
      offset: 0
    })

    // I've gotten lazier and lazier with variable names as this file has
    // gotten longer. I've regressed to single letter variable names
    let last_end = start
    nodes.forEach((n) => {
      const length = new LogootInt(n.end.l(level)).sub(last_end.l(level)).js_int
      // Now, merge this removal with possible other ones in the removal_bst
      const nodes = _mergeNode(
        this.removal_bst,
        last_end,
        length,
        (node) => {
          if (node.rclk.cmp(rclk) < 0) {
            return -1
          }
          return 1
        },
        (node) => {
          this.removal_bst.add(node)
        },
        (node, pos, length, whole) => {
          if (whole) {
            this.removal_bst.remove(node)
          }
        }
      )

      // Make sure the removals actually exist
      nodes.forEach((node) => {
        node.rclk = rclk
        delete node.offset

        this.removal_bst.add(node)
      })
      last_end = n.end
    })

    return { removals }
  }
}

export {
  LogootInt,
  LogootPosition,
  KnownPositionBst,
  LogootBst,
  Removal,
  ListDocumentModel,
  _mergeNode
}
