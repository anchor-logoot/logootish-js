/**
 * @file This is the core of the Logootish algorithm. It contains all position
 * manipulation code.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { arraymap, FatalError, CompareResult } from './utils'
import { Int32 } from './ints'
import { Bst } from './bst'

import { debug } from './debug'

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
class LogootPosition extends Array<LogootInt> {
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

  static fromJSON(eventnode: LogootPosition.JSON): LogootPosition {
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
   * Returns a new position with `offset` added to the lowest level of the
   * position.
   */
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
  /**
   * Returns a new position with `offset` subtracted from the lowest level of
   * the position.
   */
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

  /**
   * Duplicates this position.
   */
  copy(): LogootPosition {
    return Object.assign(
      new LogootPosition(),
      this.map((i) => new LogootInt(i))
    )
  }

  /**
   * Return a copy of this position, but with the number of levels specified by
   * `level`. If this position has fewer levels, zeroes will be added in place.
   */
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

/**
 * Logoot treats each atom as seperate. However, in a real-world environment, it
 * is not practical to treat each atom seperately. To save memory and CPU time,
 * the algorithm groups together consecutive atoms into `LogootNode`s. A
 * `LogootNode` is technically just a series of consecutive atoms with the same
 * `rclk` (vector clock).
 */
class LogootNode {
  known_position = 0
  length = 0
  start: LogootPosition = new LogootPosition()
  rclk: LogootInt = new LogootInt(0)

  /**
   * @param node - A node to copy, C++ style
   */
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

  /**
   * The end of the node. Note that technically there is not an atom at this
   * position, so it's fair game to have another node placed at this position.
   */
  get end(): LogootPosition {
    return this.start.offsetLowest(this.length)
  }

  toString(): string {
    return (
      this.start.toString() +
      (typeof this.known_position === 'number'
        ? '(' + this.known_position + ')'
        : '') +
      ` + ${this.length} @ ${this.rclk}`
    )
  }
}
type LogootNodeWithMeta = LogootNode & { offset: number }

enum EventState {
  /**
   * Not being actively sent and can be modified.
   */
  PENDING,
  /**
   * In transit. Cannot be modified.
   */
  SENDING,
  /**
   * Already sent. Also cannot be modified.
   */
  COMPLETE
}
/**
 * @deprecated in favor of typeof statements, but I've been meaning to remove
 * code dependent on this for a few versions now.
 * @todo Fix me
 */
enum EventType {
  INSERTION,
  REMOVAL
}

/**
 * Generic event interface.
 */
interface LogootEvent {
  type: EventType
  state: EventState
  // eslint-disable-next-line
  toJSON(): any
  rclk: LogootInt
}

/**
 * An event sent when text is added, which contains a body and start position.
 */
class InsertionEvent implements LogootEvent {
  type = EventType.INSERTION
  body = ''
  start?: LogootPosition = undefined
  known_position?: number = undefined
  rclk = new LogootInt()

  // Previous & next insertion event
  last: InsertionEvent = undefined
  next: InsertionEvent = undefined

  state = EventState.PENDING

  constructor(
    body: string,
    left?: LogootPosition,
    right?: LogootPosition,
    rclk?: LogootInt,
    known_position?: number
  ) {
    Object.assign(this, {
      body,
      known_position,
      state: EventState.PENDING,
      start: new LogootPosition(body.length, left, right),
      rclk: new LogootInt(rclk)
    })
  }

  static fromJSON(eventnode: InsertionEvent.JSON): InsertionEvent {
    return new InsertionEvent(
      eventnode.body,
      LogootPosition.fromJSON(eventnode.start),
      undefined,
      LogootInt.fromJSON(eventnode.rclk)
    )
  }
  toJSON(): InsertionEvent.JSON {
    return {
      body: this.body,
      start: this.start.toJSON(),
      rclk: this.rclk.toJSON()
    }
  }

  get length(): number {
    return this.body.length
  }
  get end(): LogootPosition {
    return this.start.offsetLowest(this.length)
  }
  get node(): LogootNode {
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
namespace InsertionEvent {
  export type JSON = {
    body: string
    start: LogootPosition.JSON
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

type Removal = { start: LogootPosition; length: number }
type RemovalJSON = { start: LogootPosition.JSON; length: number }
/**
 * An event sent when text is removed, which contains an array of start
 * positions and lengths. An array was chosen since it is preferred for one
 * operation to translate to one event. In an insertion, this is easy since
 * there is just a start and body. However, a removal might remove areas of text
 * that are on different levels and could generate many events.
 */
class RemovalEvent implements LogootEvent {
  type = EventType.REMOVAL
  removals: Removal[] = []
  rclk: LogootInt

  state = EventState.PENDING

  constructor(removals: Removal[], rclk?: LogootInt) {
    this.removals = removals
    this.rclk = new LogootInt(rclk)
  }

  static fromJSON(eventnode: RemovalEvent.JSON): RemovalEvent {
    return new RemovalEvent(
      eventnode.removals.map((r) => ({
        start: LogootPosition.fromJSON(r.start),
        length: r.length
      })),
      LogootInt.fromJSON(eventnode.rclk)
    )
  }
  toJSON(): RemovalEvent.JSON {
    return {
      removals: this.removals.map((r) => ({
        start: r.start.toJSON(),
        length: r.length
      })),
      rclk: this.rclk.toJSON()
    }
  }
}
namespace RemovalEvent {
  export type JSON = { removals: RemovalJSON[]; rclk: LogootInt.JSON }
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
  start: LogootPosition
  end: LogootPosition
  clip_nstart: boolean
  clip_nend: boolean
  whole_node: boolean
  level: number
}

/**
 * A representation of the Logootish Document that maps "real," continuous
 * `known_position`s to Logoot positions.
 * @todo Remove all code specific to the event system being used.
 * @todo Overhaul insert/remove functions to never handle events or text.
 * Instead, another module should handle everything having to do with events.
 * This would make the document universal for any data type, including, but not
 * limited to, arrays and rich text.
 */
class Document {
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
  /** Events that need to get sent over Matrix */
  pending_events: LogootEvent[] = []
  /**
   * See the Logoot paper for why. Unlike the Logoot implementation, this is
   * incremented with each deletion only.
   */
  vector_clock = new LogootInt()

  /**
   * Used to keep track of active EventEmitter listeners having anything to do
   * with this document
   * @deprecated it shouldn't be here and is temporary
   * @todo Move this to matrix-notepad
   */
  _active_listeners: any[] = []

  private send: (e: LogootEvent) => Promise<any>

  private insertLocal: (position: number, body: string) => void
  private removeLocal: (position: number, length: number) => void

  last_insertion_event: InsertionEvent = undefined

  /**
   * @param send - A callback function to send a LogootEvent
   * @param insertLocal - A callback function to insert text
   * @param removeLocal - A callback function to remove text
   */
  constructor(
    send: (e: LogootEvent) => Promise<any>,
    insertLocal: (position: number, body: string) => void,
    removeLocal: (position: number, length: number) => void
  ) {
    this.send = send
    this.insertLocal = insertLocal
    this.removeLocal = removeLocal
  }

  /**
   * Remove an event from the pending event array
   */
  private _removePendingEvent(event: LogootEvent): boolean {
    const index = this.pending_events.indexOf(event)
    if (index >= 0) {
      this.pending_events.splice(index, 1)
      return true
    }
    return false
  }
  /**
   * Merge an event with other neighboring ones
   */
  private _tryMergeEvents(event: InsertionEvent): boolean {
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

        if (this.last_insertion_event === oldevent) {
          this.last_insertion_event = oldevent.last
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

        if (this.last_insertion_event === oldevent) {
          this.last_insertion_event = oldevent.next
        }
        oldevent = oldevent.next
      }
      return true
    }
    return false
  }

  /**
   * Send a `LogootEvent` using the document-specific logic.
   */
  private _pushEvent(event: LogootEvent): void {
    this.pending_events.push(event)

    const queue_send = (): void => {
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
              event.type === EventType.INSERTION &&
              this._tryMergeEvents(event as InsertionEvent)
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

  /**
   * Inform the document of new text in the local text copy. This will call the
   * `send` function with the resulting event.
   * @param position - The index of new text
   * @param text - The text that will be inserted
   */
  insert(position: number, text: string): void {
    debug.debug('INSERT', position, text)

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

    const event = new InsertionEvent(
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
      this.last_insertion_event &&
      event.start.cmp(this.last_insertion_event.end) === 0
    ) {
      event.last = this.last_insertion_event
      this.last_insertion_event.next = event
    }
    if (this._tryMergeEvents(event)) {
      return
    }
    this._pushEvent(event)
    this.last_insertion_event = event
  }

  /**
   * Inform the document of removed text in the local text copy. This will call
   * the `send` function with the resulting event.
   * @param position - The index of old text
   * @param length - The length text that will be removed
   */
  remove(position: number, length: number): void {
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
  _mergeNode(
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
                n.length = new LogootInt(start[level]).sub(
                  n.start[level]
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
                // We also have to re-add it to the BSTs because they are
                // sorted by start position, so if we modify the start, we could
                // break the sorting
                endnode.length = new LogootInt(n_end_old[level]).sub(
                  end[level]
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

      const node: LogootNodeWithMeta = Object.assign(new LogootNode(), {
        offset
      })
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

  /**
   * Inform the document of an incoming event from remote documents. The
   * function `insertLocal` will be called based on the results of this.
   * @param event_contents - The raw incoming JSON
   */
  remoteInsert(event_contents: InsertionEvent.JSON): void {
    const { body, start: nstart, rclk: this_rclk } = InsertionEvent.fromJSON(
      event_contents
    )
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
      this.insertLocal(node.known_position, node_body)

      this.ldoc_bst.add(node)
      this.logoot_bst.add(node)
    })
  }

  /**
   * Inform the document of an incoming event from remote documents. The
   * function `removeLocal` will be called based on the results of this.
   * @param event_contents - The raw incoming JSON
   */
  remoteRemove(event_contents: RemovalEvent.JSON): void {
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
    })
  }
}

export {
  EventType,
  EventState,
  Document,
  InsertionEvent,
  RemovalEvent,
  LogootNode,
  LogootPosition
}
