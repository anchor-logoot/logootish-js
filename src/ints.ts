import { CompareResult, Comparable } from './utils.ts'

// FutureType is the type of the subclass. IntTypes of different subclasses
// intentionally cannot be added together because this would be difficult to
// support.
abstract class IntType<FutureType> extends Comparable<FutureType | number> {
  // eslint-disable-next-line
  abstract toJSON(): any
  abstract toString(): string

  abstract add(n: FutureType | number): FutureType
  abstract sub(n: FutureType | number): FutureType

  abstract js_int: number
}

class Int32 extends IntType<Int32> {
  // Size limit the int, enforce signing, and remove decimals
  int32 = new Int32Array([0])

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

  cmp(n: Int32 | number): CompareResult {
    if (n instanceof Int32) {
      return ((this.int32[0] >= n.int32[0] ? 1 : 0) +
        (this.int32[0] <= n.int32[0] ? -1 : 0)) as CompareResult
    } else {
      return ((this.int32[0] >= n ? 1 : 0) +
        (this.int32[0] <= n ? -1 : 0)) as CompareResult
    }
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
