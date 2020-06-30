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

/**
 * Returns a function that will return the value of `cb` by calling it once,
 * then returning the same value each time after. This is used to compute a
 * value that may be used multiple times, but is expensive to compute if
 * unnecessary.
 * @param cb The function to determine the value of
 * @returns The value returned by `cb`
 */
function ifNeeded<T>(cb: () => T): () => T {
  let val: T
  let computed = false
  return () => {
    if (!computed) {
      val = cb()
      computed = true
    }
    return val
  }
}

export {
  InternalError,
  FatalError,
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  Comparable,
  ifNeeded
}
