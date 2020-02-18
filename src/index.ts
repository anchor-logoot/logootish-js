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
  LogootBst,
  NodeType
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
interface LogootishEvent {
  readonly type: string
  state: EventState
  // eslint-disable-next-line
  toJSON(): any
}

export {
  EventType,
  EventState,
  ListDocumentModel,
  LogootInt,
  LogootPosition,
  NodeType
}
