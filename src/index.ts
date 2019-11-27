/**
 * @file This is the core of the Logootish algorithm. It contains all position
 * manipulation code.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { debug } from './debug'
import {
  ListDocumentModel,
  Removal,
  LogootInt,
  LogootPosition,
  KnownPositionBst,
  LogootBst
} from './listmodel'

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
 * @TODO Fix me
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
  rclk = new LogootInt()

  // Previous & next insertion event
  last: InsertionEvent = undefined
  next: InsertionEvent = undefined

  state = EventState.PENDING

  constructor(body: string, start = new LogootPosition(), rclk?: LogootInt) {
    Object.assign(this, {
      body,
      start,
      rclk: new LogootInt(rclk)
    })
  }

  static fromJSON(eventnode: InsertionEvent.JSON): InsertionEvent {
    return new InsertionEvent(
      eventnode.body,
      LogootPosition.fromJSON(eventnode.start),
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
        body: { type: 'string' },
        start: LogootPosition.JSON.Schema,
        rclk: LogootInt.JSON.Schema
      }
    }
  }
}

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

/**
 * Exists only for backwards compatability.
 * @deprecated Will be removed in next minor version bump. Semver allows this
 * when the major version is 0.
 * @TODO Remove this class. Create an event bus system.
 */
class Document {
  /** Events that need to get sent over Matrix */
  pending_events: LogootEvent[] = []

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

  doc: ListDocumentModel = new ListDocumentModel()

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

  get ldoc_bst(): KnownPositionBst {
    return this.ldoc_bst
  }
  get logoot_bst(): LogootBst {
    return this.logoot_bst
  }
  get removal_bst(): LogootBst {
    return this.removal_bst
  }

  /**
   * Inform the document of new text in the local text copy. This will call the
   * `send` function with the resulting event.
   * @param position - The index of new text
   * @param text - The text that will be inserted
   */
  insert(position: number, text: string): void {
    const ins = this.doc.insertLocal(position, text.length)
    this._pushEvent(new InsertionEvent(text, ins.position, ins.rclk))
  }
  /**
   * Inform the document of removed text in the local text copy. This will call
   * the `send` function with the resulting event.
   * @param position - The index of old text
   * @param length - The length text that will be removed
   */
  remove(position: number, length: number): void {
    const { removals, rclk } = this.doc.removeLocal(position, length)
    this._pushEvent(new RemovalEvent(removals, rclk))
  }
  /**
   * Inform the document of an incoming event from remote documents. The
   * function `insertLocal` will be called based on the results of this.
   * @param event_contents - The raw incoming JSON
   */
  remoteInsert(event_contents: InsertionEvent.JSON): void {
    const { body, start, rclk } = InsertionEvent.fromJSON(event_contents)
    const { insertions } = this.doc.insertLogoot(start, body.length, rclk)
    insertions.forEach(({ offset, length, known_position }) =>
      this.insertLocal(known_position, body.substr(offset, length))
    )
  }
  /**
   * Inform the document of an incoming event from remote documents. The
   * function `removeLocal` will be called based on the results of this.
   * @param event_contents - The raw incoming JSON
   */
  remoteRemove(event_contents: RemovalEvent.JSON): void {
    const { rclk, removals } = RemovalEvent.fromJSON(event_contents)
    removals.forEach(({ start, length }) => {
      const { removals } = this.doc.removeLogoot(start, length, rclk)
      removals.forEach(({ known_position, length }) =>
        this.removeLocal(known_position, length)
      )
    })
  }
}

export {
  EventType,
  EventState,
  ListDocumentModel,
  InsertionEvent,
  RemovalEvent,
  LogootInt,
  LogootPosition,
  Document
}
