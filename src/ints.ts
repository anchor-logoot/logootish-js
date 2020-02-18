/**
 * @file Definition of various integers.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */
/** */

import { CompareResult, Comparable } from './utils'

/**
 * An abstract subclass of `Comparable` to provide a generic interface for
 * integer types that may not be supported by JavaScript
 * @template FutureType - The type of the subclass with which to restrict all
 * operations to the int class.
 * @inheritdoc
 */
abstract class IntType<FutureType> extends Comparable<FutureType | number> {
  // eslint-disable-next-line
  abstract toJSON(): any
  abstract toString(): string

  /**
   * Add another integer to the value of this one
   * @param n - The number to add
   */
  abstract add(n: FutureType | number): FutureType
  /**
   * Add another integer to the value of this one
   * @param n - The number to subtract
   */
  abstract sub(n: FutureType | number): FutureType

  /**
   * Assign another integer to this object
   * @param n - The number to assign
   */
  abstract sub(n: FutureType | number): FutureType

  /**
   * The JavaScript int type for this integer (with an exception thrown if the
   * value cannot be represented in 32 bits)
   */
  abstract js_int: number
}

/**
 * An `IntType` that restricts the number to 32 bits by using an `Int32Array`.
 * @inheritdoc
 * @example ```typescript
 * const a = new Int32(5)
 * console.log(a.toString()) // 5
 * a.add(10).sub(8)
 * console.log(a.toString()) // 7
 * const b = new Int32(3)
 * console.log(a.cmp(b)) // 1
 * ```
 */
class Int32 extends IntType<Int32> {
  // Size limit the int, enforce signing, and remove decimals
  private int32 = new Int32Array([0])

  constructor(n: Int32 | number = 0) {
    super()
    if (n instanceof Int32) {
      this.int32[0] = n.int32[0]
    } else {
      this.int32[0] = n
    }
  }

  static fromJSON(obj: Int32.JSON): Int32 {
    return new Int32(obj)
  }

  toJSON(): Int32.JSON {
    return this.int32[0]
  }

  add(n: Int32 | number): Int32 {
    if (n instanceof Int32) {
      this.int32[0] += n.int32[0]
    } else {
      this.int32[0] += n
    }
    return this
  }
  sub(n: Int32 | number): Int32 {
    if (n instanceof Int32) {
      this.int32[0] -= n.int32[0]
    } else {
      this.int32[0] -= n
    }
    return this
  }

  assign(n: Int32 | number): Int32 {
    if (n instanceof Int32) {
      this.int32[0] = n.int32[0]
    } else {
      this.int32[0] = n
    }
    return this
  }

  cmp(n: Int32 | number): CompareResult {
    if (n instanceof Int32) {
      return ((this.int32[0] >= n.int32[0] ? 1 : 0) +
        (this.int32[0] <= n.int32[0] ? -1 : 0)) as CompareResult
    } else {
      return ((this.int32[0] >= n ? 1 : 0) +
        (this.int32[0] <= n ? -1 : 0)) as CompareResult
    }
  }

  copy(): Int32 {
    return new Int32(this)
  }

  get js_int(): number {
    return this.int32[0]
  }

  toString(): string {
    return this.int32[0].toString()
  }
}
namespace Int32 {
  export type JSON = number
  export namespace JSON {
    export const Schema = { type: 'number' }
  }
}

export { IntType, Int32 }
