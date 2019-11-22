/**
 * @file Various utilities that don't belong anywhere else.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */

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
 * One of zero, one, or negative one.
 */
type CompareResult = -1 | 0 | 1
/**
 * A function type that takes `T` and returns a CompareResult.
 */
type CompareFunction<T> = (other: T) => CompareResult
/**
 * A function type that takes two of a type `T` and returns a CompareResult.
 */
type DualCompareFunction<T> = (a: T, b: T) => CompareResult

/**
 * A utility abstract class with no implementation for the function `cmp` and
 * implementations for `gt`, `gteq`, `eq`, `lteq`, and `lt` functions.
 * @template T The other type that can be compared.
 */
abstract class Comparable<T> {
  /**
   * Compare this object to another one.
   */
  abstract cmp(other: T): CompareResult
  /**
   * @return True if this object is greater than the one provided.
   */
  gt(n: T): boolean {
    return this.cmp(n) === 1
  }
  /**
   * @return True if this object is greater than or equal to the one provided.
   */
  gteq(n: T): boolean {
    return this.cmp(n) >= 0
  }
  /**
   * @return True if this object is equal to the one provided.
   */
  eq(n: T): boolean {
    return this.cmp(n) === 0
  }
  /**
   * @return True if this object is less than or equal to the one provided.
   */
  lteq(n: T): boolean {
    return this.cmp(n) <= 0
  }
  /**
   * @return True if this object is less than the one provided.
   */
  lt(n: T): boolean {
    return this.cmp(n) === -1
  }
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

export {
  arraymap,
  FatalError,
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  Comparable,
  MemberPtr
}
