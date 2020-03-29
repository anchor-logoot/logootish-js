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
 * Like the built-in map function, but it replaces the element with an arbitrary
 * number of elements, making it a combination of map, push, and filter.
 * @template T - The type of the array elements.
 * @param array - The array to map. It will be modified.
 * @param fn - The element mapper function. It takes the current element as an
 * argument and returns the element(s) take its place.
 * @return The same array that was passed as an argument.
 */
function arraymap<T>(array: T[], fn: (el: T) => T[]): T[] {
  for (let i = 0; i < array.length; ) {
    const newarray = fn(array[i])
    array.splice(i, 1, ...newarray)
    i += newarray.length ? newarray.length : 1
  }
  return array
}

/**
 * A class created with a variable `fatal` added and set to true. This is used
 * for ensuring that a client knows to shut down a document if an error has
 * indicated that the document is corrupt.
 */
class FatalError extends Error {
  fatal = true
}

/**
 * Designed to emulate pointers to members of an object. This is useful inside
 * the B-trees. This should not be used like a C pointer: If the value in the
 * destination object changes, so does the value reported by this object.
 * @template T - The container object type.
 * @template K - The key inside the object.
 */
class MemberPtr<T, K extends keyof T> {
  private obj: T
  private key: K
  /**
   * @param obj - The object with the member to reference.
   * @param key - The key of the reference inside the object.
   */
  constructor(obj: T, key: K) {
    this.obj = obj
    this.key = key
  }
  /**
   * The value of the 'pointer.'
   */
  get value(): T[K] {
    return this.obj[this.key]
  }
  set value(val: T[K]) {
    this.obj[this.key] = val
  }
}

function allKeys<T, K extends keyof T>(obj: T): K[] {
  return (Object.keys(obj) as K[]).concat(
    Object.getOwnPropertySymbols(obj) as K[]
  )
}

function allValues<T, V extends T[keyof T]>(obj: T): V[] {
  return allKeys(obj).map((k) => obj[k]) as V[]
}

const BreakException = {}
function catchBreak(fn: () => void): void {
  try {
    fn()
  } catch (e) {
    if (e !== BreakException) {
      throw e
    }
  }
}

export {
  arraymap,
  FatalError,
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  Comparable,
  MemberPtr,
  allKeys,
  allValues,
  BreakException,
  catchBreak
}
