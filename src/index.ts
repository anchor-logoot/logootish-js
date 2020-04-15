/**
 * @file This file imports the ListDocumentModel and defines event handling
 * systems.
 * @TODO Move event abstraction layer here
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import {
  ListDocumentModel,
  LogootInt,
  LogootPosition,
  NodeType,
  InsertionConflictError
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
 * Generic event interface.
 */
interface LogootishEvent {
  state: EventState
  readonly type: string
  // eslint-disable-next-line
  toJSON(): any
}

export {
  EventState,
  ListDocumentModel,
  LogootInt,
  LogootPosition,
  NodeType,
  InsertionConflictError
}
