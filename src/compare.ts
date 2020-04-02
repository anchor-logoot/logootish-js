/**
 * @file Several useful things for doing comparisons and sorting data.
 * @author Nathan Pennie <kb1rd@kb1rd.net>
 */

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
 * Turns a number into a `CompareResult.` If it is greater than 0, it will
 * become 1. If it is less then 0, it will become -1. If the input is
 * violating type constraints and is not a number, an error will be thrown.
 * @param n - The number to transform
 * @returns `-1` if `n<0`, `0` if `n==0`, `1` if `n>0`
 * @throws {TypeError} If `n` is not a number
 */
function cmpResult(n: number): CompareResult {
  if (isNaN(n) || n === undefined || n === null) {
    throw new TypeError(`Invalid compare result '${n}.'`)
  }
  return n > 0 ? 1 : n < 0 ? -1 : 0
}

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
 * An interface for anything that resembles a range of possible values.
 */
interface BaseRangeContainer<T> {
  /**
   * Determines if `item` is in this range.
   * @param item - The item to test
   * @returns True if the item is in the range
   */
  contains(item: T): boolean
  /**
   * Determines *all* of `range` is in this range
   * @param item - The range to test
   * @returns True if this range contains `range`
   */
  doesContainInRange(range: TypeRange<T>): boolean
  /**
   * Determines *any* of `range` is in this range
   * @param item - The range to test
   * @returns True if this range contains any element in `range`
   */
  mayContainInRange(range: TypeRange<T>): boolean
}

class RangeBounds {
  /**
   * **L**esser **C**losed **G**reater **C**losed
   */
  static LCGC = new RangeBounds(true, true)
  /**
   * **L**esser **O**pen **G**reater **O**pen
   */
  static LOGO = new RangeBounds(false, false)
  /**
   * **L**esser **C**losed **G**reater **O**pen
   */
  static LCGO = new RangeBounds(true, false)
  /**
   * **L**esser **O**pen **G**reater **C**losed
   */
  static LOGC = new RangeBounds(false, true)

  /**
   * True if the left side is closed.
   */
  readonly closed_left: boolean
  /**
   * True if the right side is closed.
   */
  readonly closed_right: boolean

  /**
   * @param a - A boolean for the closure of the left side **or** a bracket
   * string (like `[)`) for the range.
   * @param b - A boolean for the closure of the right side. If brackets are
   * provided, this will be ignored.
   */
  constructor(a: boolean | '[]' | '()' | '[)' | '(]', b?: boolean) {
    if (a === true || a === false) {
      this.closed_left = a
      this.closed_right = Boolean(b)
    } else if (a[0] && a[1]) {
      this.closed_left = a[0] === '['
      this.closed_right = a[1] === ']'
    } else {
      this.closed_left = true
      this.closed_right = true
    }
  }
  /**
   * @returns A string that represents the left bracket (`[` or `(`)
   */
  get left_str(): string {
    return this.closed_left ? '[' : '('
  }
  /**
   * @returns A string that represents the right bracket (`]` or `)`)
   */
  get right_str(): string {
    return this.closed_right ? ']' : ')'
  }
  /**
   * @returns A bracket string like `[)`
   */
  toString(): string {
    return this.left_str + this.right_str
  }
}

/**
 * Specifies a bound of a range.
 */
type BoundSelector = 'max' | 'min'
/**
 * Represents a simple range with a minimum and a maximum. Inclusivity is
 * controlled through `bounds`.
 */
class TypeRange<T> implements BaseRangeContainer<T> {
  /**
   * @param cf - A compare function that is used to compare two `T`
   * @param min - The minimum value
   * @param max - The maximum value
   * @param bounds - The inclusivity bounds to use
   */
  constructor(
    public readonly cf: DualCompareFunction<T>,
    public min?: T,
    public max?: T,
    public bounds: RangeBounds = RangeBounds.LCGC
  ) {}

  /**
   * Returns a range that is greater than `t`.
   * @param cf - The compare function to use
   * @param t - The value to use
   */
  static gt<T>(cf: DualCompareFunction<T>, t: T): TypeRange<T> {
    return new TypeRange(cf, t, undefined, new RangeBounds(false, false))
  }
  /**
   * Returns a range that is greater than or equal to `t`.
   * @param cf - The compare function to use
   * @param t - The value to use
   */
  static gteq<T>(cf: DualCompareFunction<T>, t: T): TypeRange<T> {
    return new TypeRange(cf, t, undefined, new RangeBounds(true, false))
  }
  /**
   * Returns a range that is less than `t`.
   * @param cf - The compare function to use
   * @param t - The value to use
   */
  static lt<T>(cf: DualCompareFunction<T>, t: T): TypeRange<T> {
    return new TypeRange(cf, undefined, t, new RangeBounds(false, false))
  }
  /**
   * Returns a range that is less than or equal to `t`.
   * @param cf - The compare function to use
   * @param t - The value to use
   */
  static lteq<T>(cf: DualCompareFunction<T>, t: T): TypeRange<T> {
    return new TypeRange(cf, undefined, t, new RangeBounds(false, true))
  }
  /**
   * A range that contains all possible values.
   * @param cf - The compare function to use
   */
  static all<T>(cf: DualCompareFunction<T>): TypeRange<T> {
    return new TypeRange(
      cf,
      undefined,
      undefined,
      new RangeBounds(false, false)
    )
  }

  /**
   * @returns True if `min` is `undefined` (Representing negative infinity)
   */
  get undef_min(): boolean {
    return (
      this.min === undefined ||
      this.min === null ||
      ((this.min as unknown) as number) === NaN ||
      ((this.min as unknown) as number) === -Infinity
    )
  }
  /**
   * @returns True if `min` is defined (not negative infinity)
   */
  get def_min(): boolean {
    return !this.undef_min
  }
  /**
   * @returns True if `max` is `undefined` (Representing infinity)
   */
  get undef_max(): boolean {
    return (
      this.max === undefined ||
      this.max === null ||
      ((this.max as unknown) as number) === NaN ||
      ((this.max as unknown) as number) === Infinity
    )
  }
  /**
   * @returns True if `max` is defined (not infinity)
   */
  get def_max(): boolean {
    return !this.undef_max
  }
  /**
   * @param b - The bound to select
   * @returns True if the bound is defined (not an infinity)
   */
  bound_def(b: BoundSelector): boolean {
    return b === 'min' ? this.def_min : this.def_max
  }
  /**
   * @param b - The bound to select
   * @returns True if the bound is undefined (is an infinity)
   */
  bound_undef(b: BoundSelector): boolean {
    return b === 'min' ? this.undef_min : this.undef_max
  }

  contains(t: T): boolean {
    return (
      (!this.min ||
        this.cf(t, this.min) >= (this.bounds.closed_left ? 0 : 1)) &&
      (!this.max || this.cf(this.max, t) >= (this.bounds.closed_right ? 0 : 1))
    )
  }
  /**
   * Finds out if `t` is less than (`-1`), inside (`0`), or greater than
   * (`1`) this range
   * @param t The object to compare
   */
  getRangeSection(t: T): CompareResult {
    if (
      this.def_max &&
      this.cf(this.max, t) < (this.bounds.closed_right ? 0 : 1)
    ) {
      return 1
    }
    if (
      this.def_min &&
      this.cf(t, this.min) < (this.bounds.closed_left ? 0 : 1)
    ) {
      return -1
    }
    return 0
  }

  /**
   * Compares this range's endpoints to endpoints of another range. The
   * comparison is relative to this (ex, it will be `1` if this is greater)
   * @param local - The local bound to use
   * @param r - The other range to use
   * @param other - The other bound to use
   * @returns The result of the comparison
   */
  compareEndpoints(
    local: BoundSelector,
    r: TypeRange<T>,
    other: BoundSelector
  ): CompareResult {
    if (this.bound_def(local) && r.bound_undef(other)) {
      return other === 'min' ? 1 : -1
    }
    if (this.bound_undef(local) && r.bound_undef(other)) {
      return local !== other ? (local === 'max' ? 1 : -1) : 0
    }
    if (this.bound_undef(local) && r.bound_def(other)) {
      return local === 'max' ? 1 : -1
    }

    const rval = this.cf(this[local] as T, r[other] as T)

    if (rval === 0) {
      const local_closed =
        local === 'min' ? !this.bounds.closed_left : this.bounds.closed_right
      const other_closed =
        other === 'min' ? !r.bounds.closed_left : r.bounds.closed_right

      if (local_closed && !other_closed) {
        return 1
      } else if (!local_closed && other_closed) {
        return -1
      }
    }
    return rval
  }

  doesContainInRange(r: TypeRange<T>): boolean {
    return (
      this.compareEndpoints('min', r, 'min') <= 0 &&
      this.compareEndpoints('max', r, 'max') >= 0
    )
  }
  mayContainInRange(r: TypeRange<T>): boolean {
    return (
      this.compareEndpoints('min', r, 'max') < 0 &&
      this.compareEndpoints('max', r, 'min') > 0
    )
  }

  toString(): string {
    return `${this.bounds.left_str}${this.min},${this.max}${this.bounds.right_str}`
  }
}

/**
 * A subclass of `TypeRange` that automatically creates a compare function if
 * `T` is of type `Comparable`.
 */
class ComparableTypeRange<T extends Comparable<T>> extends TypeRange<T> {
  constructor(min: T, max: T, bounds?: RangeBounds) {
    super((a: T, b: T) => a.cmp(b), min, max, bounds)
  }
}

/**
 * A subclass of `TypeRange` for numbers. It has helper functions for applying
 * an offset to the range.
 */
class NumberRange extends TypeRange<number> {
  constructor(min: number, max: number, bounds?: RangeBounds) {
    super((a, b) => cmpResult(a - b), min, max, bounds)
  }
  /**
   * Add a positive offset to the range
   * @param o - The offset to apply
   */
  push_offset(o: number): void {
    this.min += o
    this.max += o
  }
  /**
   * Add a negative offset to the range
   * @param o - The offset to apply
   */
  pop_offset(o: number): void {
    this.min -= o
    this.max -= o
  }
}

export {
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  cmpResult,
  Comparable,
  BaseRangeContainer,
  RangeBounds,
  TypeRange,
  ComparableTypeRange,
  NumberRange
}
