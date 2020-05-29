/**
 * @file Various utilities that don't belong anywhere else.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import {
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  Comparable
} from './compare'

/**
 * An internal error that does not result in corruption, but must be a bug.
 */
class InternalError extends Error {}

/**
 * A class created with a variable `fatal` added and set to true. This is used
 * for ensuring that a client knows to shut down a document if an error has
 * indicated that the document is corrupt.
 */
class FatalError extends InternalError {
  fatal = true
}

export {
  InternalError,
  FatalError,
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  Comparable
}
