import { arraymap, FatalError, CompareResult } from './utils.ts'
import { Int32 } from './ints.ts'
import { Bst } from './bst.ts'

import { debug } from './debug.ts'

// What a C++ typedef would do
// This makes it possible to completely swap out the type of the int used in the
// algorithm w/o actually replacing each instance (which would be a real pain)
import LogootInt = Int32

class LogootPosition extends Array<LogootInt> {
  constructor(len: number = 0, start?: LogootPosition, end?: LogootPosition) {
    super(new LogootInt())

    if (!start && end && end[0]) {
      Object.assign(this, end.inverseOffsetLowest(len))
    } else if (!end && start && start[0]) {
      Object.assign(this, start)
    } else if (start && end) {
      let done = false
      const itstart = start.values()
      const itend = end.values()
      let nstart
      let nend

      this.length = 0

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
          this.push(new LogootInt(nstart.value))
        } else if (!nstart.done) {
          // So there's no end restriction, that means we can just add right on
          // top of the old end (the start of the new node)
          this.push(new LogootInt(nstart.value))
          done = true
        } else if (!nend.done) {
          // We have an end restriction, but no start restriction, so we just
          // put the new node's start behind the old end
          this.push(new LogootInt(nend.value).sub(len))
          done = true
        } else {
          // So both other IDs have nothing else. It must be time to make a new
          // level and be done
          this.push(new LogootInt())
          done = true
        }
      }
    }
  }

  static fromJSON(eventnode: LogootPosition.JSON) {
    const pos = new LogootPosition()
    pos.length = 0
    eventnode.forEach((n) => {
      pos.push(LogootInt.fromJSON(n))
    })
    return pos
  }
  toJSON(): LogootPosition.JSON {
    return this.map((n) => n.toJSON())
  }

  get levels() {
    // A zero-length position is NOT valid
    // Through some sneakyness, you COULD directly assign the array to make it
    // have a length of zero. Don't do it.
    return this.length - 1
  }

  offsetLowest(offset: number | LogootInt): LogootPosition {
    return Object.assign(
      new LogootPosition(),
      this.map((current, i, array) => {
        return i < array.length - 1
          ? current
          : new LogootInt(current).add(offset)
      })
    )
  }
  inverseOffsetLowest(offset: number | LogootInt): LogootPosition {
    return Object.assign(
      new LogootPosition(),
      this.map((current, i, array) => {
        return i < array.length - 1
          ? current
          : new LogootInt(current).sub(offset)
      })
    )
  }

  copy(): LogootPosition {
    return Object.assign(
      new LogootPosition(),
      this.map((i) => new LogootInt(i))
    )
  }

  // TODO: Move to compare func
  equivalentPositionAtLevel(level: number): LogootPosition {
    return Object.assign(
      new LogootPosition(),
      new Array(level + 1).fill(0, 0, level + 1).map((el, i) => {
        return new LogootInt(this[i])
      })
    )
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
    switch (this[level].cmp(pos[level])) {
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

  clamp(min: LogootPosition, max: LogootPosition) {
    return this.cmp(min) < 0 ? min : this.cmp(max) > 0 ? max : this
  }

  toString() {
    let str = '['
    this.forEach((el, i, a) => {
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

class LogootNode {
  known_position: number = 0
  length: number = 0
  start: LogootPosition = new LogootPosition()
  rclk: LogootInt = new LogootInt(0)

  constructor(node?: LogootNode) {
    if (node) {
      Object.assign(this, {
        known_position: node.known_position,
        length: node.length,
        start: node.start.offsetLowest(new LogootInt()),
        rclk: new LogootInt(node.rclk)
      })
    }
  }

  get end() {
    return this.start.offsetLowest(this.length)
  }

  toString() {
    return (
      this.start.toString() +
      (typeof this.known_position === 'number'
        ? '(' + this.known_position + ')'
        : '') +
      ` + ${this.length} @ ${this.rclk}`
    )
  }
}

enum EventState {
  PENDING, SENDING, COMPLETE
}
enum EventType {
  INSERTATION, REMOVAL
}

interface LogootEvent {
  type: EventType
  state: EventState
  toJSON(): any
  rclk: LogootInt
}

class InsertationEvent implements LogootEvent {
  type = EventType.INSERTATION
  body = ''
  start?: LogootPosition = undefined
  known_position?: number = undefined
  rclk = new LogootInt()

  // Previous & next insertation event
  last: InsertationEvent = undefined
  next: InsertationEvent = undefined

  state = EventState.PENDING

  constructor(body: string, left?: LogootPosition, right?: LogootPosition, rclk?: LogootInt, known_position?: number) {
    Object.assign(this, {
      body,
      known_position,
      state: EventState.PENDING,
      start: new LogootPosition(body.length, left, right),
      rclk: new LogootInt(rclk)
    })
  }

  static fromJSON(eventnode: InsertationEvent.JSON) {
    return new InsertationEvent(
      eventnode.body,
      LogootPosition.fromJSON(eventnode.start),
      undefined,
      LogootInt.fromJSON(eventnode.rclk)
    )
  }
  toJSON(): InsertationEvent.JSON {
    return {
      body: this.body,
      start: this.start.toJSON(),
      rclk: this.rclk.toJSON()
    }
  }

  get length() {
    return this.body.length
  }
  get end() {
    return this.start.offsetLowest(this.length)
  }
  get node() {
    const node = new LogootNode()
    Object.assign(node, {
      start: this.start,
      length: this.length,
      known_position: this.known_position,
      rclk: this.rclk
    })
    return node
  }
}
namespace InsertationEvent {
  export type JSON = {
    body: string,
    start: LogootPosition.JSON,
    rclk: LogootInt.JSON
  }
  export namespace JSON {
    export const Schema = {
      type: 'object',
      properties: {
        removals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: LogootPosition.JSON.Schema,
              length: { type: 'number' }
            }
          }
        },
        rclk: LogootInt.JSON.Schema
      }
    }
  }
}

type Removal = { start: LogootPosition, length: number }
type RemovalJSON = { start: LogootPosition.JSON, length: number }
class RemovalEvent implements LogootEvent {
  type = EventType.REMOVAL
  removals: Removal[] = []
  rclk: LogootInt

  state = EventState.PENDING

  constructor(removals: Removal[], rclk?: LogootInt) {
    this.removals = removals
    this.rclk = new LogootInt(rclk)
  }

  static fromJSON(eventnode: RemovalEvent.JSON) {
    return new RemovalEvent(
      eventnode.removals.map(
        (r) => ({ start: LogootPosition.fromJSON(r.start), length: r.length })
      ),
      LogootInt.fromJSON(eventnode.rclk)
    )
  }
  toJSON(): RemovalEvent.JSON {
    return {
      removals: this.removals.map(
        (r) => ({ start: r.start.toJSON(), length: r.length })
      ),
      rclk: this.rclk.toJSON()
    }
  }
}
namespace RemovalEvent {
  export type JSON = { removals: RemovalJSON[], rclk: LogootInt.JSON }
  export namespace JSON {
    export const Schema = {
      type: 'object',
      properties: {
        removals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: LogootPosition.JSON.Schema,
              length: { type: 'number' }
            }
          }
        },
        rclk: LogootInt.JSON.Schema
      }
    }
  }
}

type KnownPositionBst = Bst<LogootNode, { known_position: number }>
type LogootBst = Bst<LogootNode, { start: LogootPosition }>

type Conflict = {
  start: LogootPosition,
  end: LogootPosition,
  clip_nstart: boolean,
  clip_nend: boolean,
  whole_node: boolean,
  level: number
}

class Document {
  // The BST maps out where all insertation nodes are in the local document's
  // memory. It is used to go from position -> node
  ldoc_bst: KnownPositionBst = new Bst((a, b) => (a.known_position - b.known_position) as CompareResult)
  // This BST maps Logoot position identifiers to their text node to allow
  // lookup of text position from Logoot ID
  logoot_bst: LogootBst = new Bst((a, b) => a.start.cmp(b.start))
  // A map of removals that do not yet have text to remove
  removal_bst: LogootBst = new Bst((a, b) => a.start.cmp(b.start))
  // Events that need to get sent over Matrix
  pending_events: LogootEvent[] = []
  // See the Logoot paper for why. Unlike the Logoot implementation, this is
  // incremented with each deletion only.
  vector_clock = new LogootInt()

  // Used to keep track of active EventEmitter listeners having anything to do
  // with this document
  // TODO: Move this to a better place
  _active_listeners: any[] = []

  send: (e: LogootEvent) => Promise<any>

  insertLocal: (position: number, body: string, meta: any) => any
  removeLocal: (position: number, length: number) => any

  last_insertation_event: InsertationEvent = undefined

  constructor(
    send: (e: LogootEvent) => Promise<any>,
    insertLocal: (position: number, body: string, meta: any) => any,
    removeLocal: (position: number, length: number) => any
  ) {
    this.send = send
    this.insertLocal = insertLocal
    this.removeLocal = removeLocal
  }

  _removePendingEvent(event: LogootEvent) {
    const index = this.pending_events.indexOf(event)
    if (index >= 0) {
      this.pending_events.splice(index, 1)
      return true
    }
    return false
  }
  _tryMergeEvents(event: InsertationEvent) {
    if (event.state !== EventState.PENDING) {
      return false
    }
    // TODO: Maybe do a tree lookup instead. But this is complicated since then
    // each node has to store its associated event
    if (event.last && event.last.state === EventState.PENDING) {
      let oldevent = event
      while (oldevent.last && oldevent.last.state === EventState.PENDING) {
        oldevent.last.body += oldevent.body

        oldevent.last.next = oldevent.next
        if (oldevent.next) {
          oldevent.next.last = oldevent.last
        }

        this._removePendingEvent(oldevent)

        if (this.last_insertation_event === oldevent) {
          this.last_insertation_event = oldevent.last
        }
        oldevent = oldevent.last
      }
      // Now try the other direction...
      this._tryMergeEvents(oldevent)
      return true
    } else if (event.next && event.next.state === EventState.PENDING) {
      let oldevent = event
      while (oldevent.next && oldevent.next.state === EventState.PENDING) {
        oldevent.next.body = oldevent.body + oldevent.next.body
        oldevent.next.start = oldevent.start

        oldevent.next.last = oldevent.last
        if (oldevent.last) {
          oldevent.last.next = oldevent.next
        }

        this._removePendingEvent(oldevent)

        if (this.last_insertation_event === oldevent) {
          this.last_insertation_event = oldevent.next
        }
        oldevent = oldevent.next
      }
      return true
    }
    return false
  }

  _pushEvent(event: LogootEvent) {
    this.pending_events.push(event)

    const self = this
    const queue_send = () => {
      event.state = EventState.SENDING
      this.send(event)
        .then(() => {
          this._removePendingEvent(event)
          event.state = EventState.COMPLETE
        })
        .catch((e) => {
          event.state = EventState.PENDING
          // TODO: Nothing is here *should* be Matrix specific
          if (e.event) {
            e.event.flagCancelled()
          }
          if (e && e.data && e.data.retry_after_ms) {
            if (
              event.type === EventType.INSERTATION &&
              self._tryMergeEvents(event as InsertationEvent)
            ) {
              debug.warn(
                `Hitting the rate limit: Will resend in ${e.data.retry_after_ms} ms with multiple messages merged together`
              )
              return {}
            }
            debug.warn(
              `Hitting the rate limit: Will resend in ${e.data.retry_after_ms} ms`
            )
            setTimeout(queue_send, e.data.retry_after_ms)
          } else {
            debug.error('Error sending event', e)
            return e
          }
        })
    }
    queue_send()
  }

  insert(position: number, text: string) {
    debug.debug('INSERT', position, text)

    // The position must be -1 for lesser because it can't count the text node
    // currently in the insertation position (we're between two nodes)
    let nodes_lesser = this.ldoc_bst.getLteq({ known_position: position - 1 })
    let nodes_greater = this.ldoc_bst.getGteq({ known_position: position })

    let lesser
    let greater

    // Nodes are not allowed to have the same position
    if (nodes_lesser.length > 1 || nodes_greater.length > 1) {
      throw new FatalError(
        'Corrupt BST. There are multiple nodes at a position.'
      )
    } else {
      lesser = nodes_lesser[0]
      greater = nodes_greater[0]
    }

    // Finally, we can create positions...
    let left_position
    let right_position

    if (lesser) {
      left_position = lesser.data.end
    }
    if (greater) {
      right_position = greater.data.start
    }

    if (lesser && lesser.data.length + lesser.data.known_position > position) {
      // This means that we're right inside another node, so the next position
      // will be inside the first node
      left_position = lesser.data.start.offsetLowest(
        position - lesser.data.known_position
      )
      right_position = left_position

      // Now, we must split the node in half (nodes can't overlap)
      const node = new LogootNode()
      node.length = lesser.data.known_position + lesser.data.length - position
      node.known_position = position + length
      node.start = right_position.offsetLowest(length)
      node.rclk = lesser.data.rclk
      this.ldoc_bst.add(node)
      this.logoot_bst.add(node)
    }

    const event = new InsertationEvent(
      text,
      left_position,
      right_position,
      this.vector_clock,
      position
    )

    // Now, make a space between the nodes
    this.ldoc_bst.operateOnAllGteq({ known_position: position }, (n) => {
      n.data.known_position += event.length
    })

    const node = event.node
    this.ldoc_bst.add(node)
    this.logoot_bst.add(node)

    // Logic to help merge events together. It is VERY rough and will really
    // only work when events are consecutive, but its better than spamming the
    // HS and having text go letter by letter when we hit the rate limit
    if (
      this.last_insertation_event &&
      event.start.cmp(this.last_insertation_event.end) === 0
    ) {
      event.last = this.last_insertation_event
      this.last_insertation_event.next = event
    }
    if (this._tryMergeEvents(event)) {
      return
    }
    this._pushEvent(event)
    this.last_insertation_event = event
  }

  remove(position: number, length: number) {
    debug.debug('REMOVE', position, length)

    // First, find any nodes that MAY have content removed from them
    const nodes = this.ldoc_bst
      .getRange(
        { known_position: position },
        { known_position: position + length - 1 }
      )
      .concat(this.ldoc_bst.getLteq({ known_position: position - 1 }))

    const removals: Removal[] = []
    let last_end: LogootPosition
    nodes.forEach(({ data }) => {
      let newlen = data.length
      let newstart = data.start
      if (data.known_position < position) {
        newlen -= position - data.known_position
        newstart = newstart.offsetLowest(position - data.known_position)
      }
      if (data.known_position + data.length > position + length) {
        newlen -= data.known_position + data.length - (position + length)
      }

      if (last_end && last_end.cmp(data.start) === 0) {
        removals[removals.length - 1].length += newlen
      } else if (newlen > 0) {
        removals.push({
          start: newstart,
          length: newlen
        })
      }

      last_end = data.end
      data.length -= newlen
      if (data.length <= 0) {
        this.logoot_bst.remove(data)
        this.ldoc_bst.remove(data)
      }
    })

    this.ldoc_bst.operateOnAllGteq({ known_position: position }, (n) => {
      n.data.known_position -= length
    })

    const event = new RemovalEvent(removals, new LogootInt(this.vector_clock))
    this.vector_clock.add(1)

    this._pushEvent(event)
  }

  _mergeNode(
    bst: LogootBst,
    nstart: LogootPosition,
    length: number,
    resolveConflict: (node: LogootNode, conflict: Conflict, lesser: LogootNode) => CompareResult,
    addNode: (node: LogootNode) => any,
    informRemoval: (node: LogootNode, pos: number, length: number, whole: boolean) => any
  ) {
    const level = nstart.levels
    const nend = nstart.offsetLowest(length)

    // These ranges are areas of the document that are already populated in the
    // region where the insert is happening. If there are conflicts, they will
    // be skipped. The end of this new insert must be added to the end as a fake
    // zero-length node so that the for each loop triggers for the end.
    let skip_ranges = bst
      .getRange({ start: nstart }, { start: nend })
      .map(({ data }) => data)
      .sort((a, b) => a.start.cmp(b.start))

    const nodes_lesser = bst.getLteq({ start: nstart })
    let lesser: LogootNode
    if (nodes_lesser.length > 1) {
      throw new FatalError(
        'Corrupt BST. There are multiple nodes at a position.'
      )
    } else if (nodes_lesser.length) {
      lesser = nodes_lesser[0].data
    }

    // Ensure that lesser is initially defined as a skip_range (this is useful
    // for some removals that may want to use conflicts with lesser 
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
              const l = new LogootInt(end[level]).sub(start[level]).js_int

              // Make a copy because we will need to modify the original
              const endnode = new LogootNode(n)
              endnode.start = end
              const n_end_old = n.end.offsetLowest(0)

              if (clip_nstart) {
                // This means we're dealing with an area ahead of the node with
                // a length > 0:
                // NNNNrrrrrnnnnn (As above, 'r' is the section of the node
                // being removed)
                n.length = new LogootInt(start[level]).sub(n.start[level])
                  .js_int

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
                // We also have to re-add it to the BSTs because they are
                // sorted by start position, so if we modify the start, we could
                // break the sorting
                endnode.length = new LogootInt(n_end_old[level]).sub(end[level])
                  .js_int
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
      // Find where we are inside lesser. If we're outside of lesser, this will
      // be greater than lesser's length and will be ignored
      if (lesser.start.levels < nstart.levels) {
        positions.push(
          new LogootInt(nstart[lesser.start.levels]).sub(
            lesser.start[lesser.start.levels]
          ).js_int
        )
      }

      // Figure out which endpoint to use, the end of lesser or where our
      // position is if its inside lesser
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

    type LogootNodeWithMeta = LogootNode & { offset: number }
    const newnodes: LogootNodeWithMeta[] = []
    // We fake the last node end to be the start of the new node because the
    // inserted text always needs to 'snap' to the end of the last node,
    // regardless of discontinuities in Logoot positions
    let last_end = nstart
    let last_known_position = known_start
    skip_ranges.forEach((skip_range) => {
      const { start, end, length } = skip_range
      // Clamped regions to consider. Anything outside of the node to be
      // inserted doesn't matter, so we clamp it out
      // Of course, that means we have to recalculate EVERYTHING *sigh*
      const cstart = start.equivalentPositionAtLevel(level).clamp(nstart, nend)
      const cend = end.equivalentPositionAtLevel(level).clamp(nstart, nend)

      // Now, find the offset in our body string
      const offset = new LogootInt(last_end[level]).sub(nstart[level]).js_int

      const node: LogootNodeWithMeta = Object.assign(
        new LogootNode(),
        { offset }
      )
      // Find the new node length by finding the distance between the last end
      // and the next one
      node.length = new LogootInt(cstart[level]).sub(last_end[level]).js_int

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
        // When incrementing the known_position, we ALWAYS use the length of
        // the whole node since we will have to skip over the node regardless
        // of how much of it actually concerns the node being added
        // For example, if we're adding a node around an existing node with a
        // greater number of levels, it will have the length of zero on our
        // current level (because it is between two positions), but we still
        // MUST skip over its entire non-zero length
        last_known_position += length
      }
    })
    return newnodes
  }

  remoteInsert(event_contents: InsertationEvent.JSON) {
    // TODO: Evaluate using `jsonschema` package
    const { body, start: nstart, rclk: this_rclk } = InsertationEvent
      .fromJSON(event_contents)
    debug.debug('REMOTE INSERT', body, nstart.toString(), this_rclk.toString())

    if (this_rclk.cmp(this.vector_clock) > 0) {
      this.vector_clock = this_rclk
      debug.info('Fast-forward vector clock to', JSON.stringify(this_rclk))
    }

    const nodes = this._mergeNode(
      this.logoot_bst,
      nstart,
      body.length,
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
      return this._mergeNode(
        this.removal_bst,
        node.start,
        node.length,
        (node, { start, end, whole_node, clip_nstart, clip_nend, level }) => {
          if (node.rclk.cmp(this_rclk) < 0) {
            return 0
          }
          return 1
        },
        (node) => {},
        (node, pos, length, whole) => {}
      ).map((newnode) => {
        // known_positions in the removal tree are BS, so set them correctly
        // here. TODO: Remove known_position from removals
        newnode.known_position = last_known_position
        newnode.offset += node.offset
        last_known_position += newnode.length
        return newnode
      })
    })

    nodes.forEach((node) => {
      node.rclk = this_rclk
      // Now, make a space between the nodes
      this.ldoc_bst.operateOnAllGteq(node, (n) => {
        if (n.data === node) {
          return
        }
        n.data.known_position += node.length
      })

      const node_body = body.substr(node.offset, node.length)
      delete node.offset
      this.insertLocal(node.known_position, node_body, {
        position: node.start
      })

      this.ldoc_bst.add(node)
      this.logoot_bst.add(node)
    })
  }

  remoteRemove(event_contents: RemovalEvent.JSON) {
    const { rclk, removals } = RemovalEvent.fromJSON(event_contents)

    const new_rclk = new LogootInt(rclk).add(1)
    if (new_rclk.cmp(this.vector_clock) > 0) {
      this.vector_clock = new_rclk
      debug.info('Fast-forward vector clock to', JSON.stringify(new_rclk))
    }

    removals.forEach((r) => {
      const { start } = r
      const end = start.offsetLowest(r.length)
      // The level where our removal is happening (always the lowest)
      const level = start.levels
      debug.debug('REMOTE REMOVE', start.toString(), r.length, rclk.toString())

      // This is basically the same as the invocation in remoteInsert, only it
      // doesn't add the resulting nodes to anything
      const nodes = this._mergeNode(
        this.logoot_bst,
        start,
        r.length,
        (node, conflict, lesser) => {
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
          this.removeLocal(pos, length)
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
        rclk: new LogootInt(),
        offset: 0
      })

      // I've gotten lazier and lazier with variable names as this file has
      // gotten longer. I've regressed to single letter variable names
      let last_end = start
      nodes.forEach((n) => {
        const length = new LogootInt(n.end[level]).sub(last_end[level]).js_int
        // Now, merge this removal with possible other ones in the removal_bst
        const nodes = this._mergeNode(
          this.removal_bst,
          last_end,
          length,
          (node, conflict) => {
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
    })
  }
}

export {
  EventType,
  EventState,
  Document,
  InsertationEvent,
  RemovalEvent,
  LogootNode,
  LogootPosition
}
