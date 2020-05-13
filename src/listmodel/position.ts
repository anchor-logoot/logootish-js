import { LogootInt } from './int'
import { CompareResult, FatalError } from '../utils'
import { BranchKey, BranchOrder } from './branch'
import { Comparable, cmpResult } from '../compare'

/**
 * A comparable position from the original Logootish algorithm, This is just an
 * array of numbers with some utility functions. In Logoot, it must always be
 * possible to allocate a position between any possible two positions. In this
 * algorithm, a position with more `levels` (or elements in the array) comes
 * first. Positions are represented in writing the same as arrays: `[1,2,3]`
 * @example ```typescript
 * const a = new LogootishPosition()
 * console.log(a.toString()) // [0]
 *
 * const b = a.offsetLowest(1)
 * console.log(b.toString()) // [1]
 *
 * console.log(new LogootishPosition(1, a, b).toString()) // [0]
 * console.log(new LogootishPosition(2, a, b).toString()) // [0,0]
 * ```
 */
class LogootishPosition extends Comparable<LogootishPosition> {
  protected array: LogootInt[] = [new LogootInt(0)]
  immutable = false

  /**
   * This constructor constructs a new position that is in the range specified
   * by `start` and `end`. By using `len`, it is possible to enforce that a
   * certain number of additional positions are available in the selected range.
   * This guarantees that there's space for a LogootNode of length `len` at this
   * position between `start` and `end`.
   *
   * @param len - The length of the allocation to make. The length is never
   * actually stored in the Logoot position, but is used when finding space for
   * the position to be created and `len` position(s) after it.
   * @param start - This will cause the new position to have a value greater
   * than or equal to this. This value is tricky: It must be the end of the last
   * node. So if `A` is at `[1]` and an allocation *after* it is desired, then
   * `[2]` would need to be passed to `start`.
   * @param end - This will cause the new position to have a value less than or
   * equal to this, subject to the value of `len`.
   * @throws {TypeError} Will throw if `start` is greater than `end`.
   */
  constructor(
    len = 0,
    readonly start?: LogootishPosition,
    readonly end?: LogootishPosition
  ) {
    super()
    if (start && end && start.gt(end)) {
      throw new TypeError('Start is greater than end')
    }
    if (!start && end) {
      this.array = end.inverseOffsetLowest(len).array
    } else if (!end && start) {
      this.array = start.copy().array
    } else if (start && end) {
      let done = false
      const itstart = start.array.values()
      const itend = end.array.values()
      let nstart
      let nend

      this.array.length = 0

      while (!done) {
        if (!nstart || !nstart.done) {
          nstart = itstart.next()
        }
        if (!nend || !nend.done) {
          nend = itend.next()
        }

        if (!nstart.done && !nend.done) {
          // See if we have enough space to insert 'len' between the nodes
          if (nend.value.gteq(new LogootInt(nstart.value).add(len))) {
            // There's space. We're done now: At the shallowest possible level
            done = true
          }
          // Regardless, the start ID is the new ID for this level of our node
          this.array.push(new LogootInt(nstart.value))
        } else if (!nstart.done) {
          // So there's no end restriction, that means we can just add right on
          // top of the old end (the start of the new node)
          this.array.push(new LogootInt(nstart.value))
          done = true
        } else if (!nend.done) {
          // We have an end restriction, but no start restriction, so we just
          // put the new node's start behind the old end
          this.array.push(new LogootInt(nend.value).sub(len))
          done = true
        } else {
          // So both other IDs have nothing else. It must be time to make a new
          // level and be done
          this.array.push(new LogootInt())
          done = true
        }
      }
    }
  }

  static fromJSON(eventnode: LogootishPosition.JSON): LogootishPosition {
    const pos = new LogootishPosition()
    pos.array.length = 0
    eventnode.forEach((n) => {
      pos.array.push(LogootInt.fromJSON(n))
    })
    return pos
  }
  static fromInts(...ints: (LogootInt | number)[]): LogootishPosition {
    const pos = new LogootishPosition()
    pos.array.length = 0
    ints.forEach((n) => {
      pos.array.push(new LogootInt(n))
    })
    return pos
  }
  toJSON(): LogootishPosition.JSON {
    return this.array.map((n) => n.toJSON())
  }

  /**
   * @returns Internal array length
   */
  get length(): number {
    // A zero-length position is NOT valid
    // Through some sneakiness, you COULD directly assign the array to make it
    // have a length of zero. Don't do it.
    return this.array.length
  }
  /**
   * Returns the last index of the array. This is useful because before this,
   * the algorithm code often contained many occurences of `length - 1`. This
   * is used to cut down redundancy.
   */
  get levels(): number {
    // A zero-length position is NOT valid
    // Through some sneakiness, you COULD directly assign the array to make it
    // have a length of zero. Don't do it.
    return this.length - 1
  }
  /**
   * An array accessor
   */
  level(n: number): LogootInt {
    if (this.immutable) {
      return this.array[n] && this.array[n].i
    }
    return this.array[n]
  }
  /**
   * An array accessor
   * @alias level
   */
  l(n: number): LogootInt {
    return this.level(n)
  }

  /**
   * Returns a new position with `offset` added to the lowest level of the
   * position.
   */
  offsetLowest(offset: number | LogootInt): LogootishPosition {
    return Object.assign(new LogootishPosition(), {
      array: this.array.map((current, i, array) => {
        return i < array.length - 1
          ? current
          : new LogootInt(current).add(offset)
      })
    })
  }
  /**
   * Returns a new position with `offset` subtracted from the lowest level of
   * the position.
   */
  inverseOffsetLowest(offset: number | LogootInt): LogootishPosition {
    return Object.assign(new LogootishPosition(), {
      array: this.array.map((current, i, array) => {
        return i < array.length - 1
          ? current
          : new LogootInt(current).sub(offset)
      })
    })
  }

  /**
   * Duplicates this position.
   */
  copy(): LogootishPosition {
    return Object.assign(new LogootishPosition(), {
      array: this.array.map((e) => new LogootInt(e))
    })
  }

  /**
   * Return a copy of this position, but with the number of levels specified by
   * `level`. If this position has fewer levels, zeroes will be added in place.
   */
  equivalentPositionAtLevel(level: number): LogootishPosition {
    return Object.assign(new LogootishPosition(), {
      array: new Array(level + 1).fill(0, 0, level + 1).map((el, i) => {
        return new LogootInt(this.array[i])
      })
    })
  }

  private cmp_level(pos: LogootishPosition, level: number): CompareResult {
    if (level >= this.length) {
      if (this.length === pos.length) {
        return 0
      }
      return 1
    }
    if (level >= pos.length) {
      return -1
    }
    switch (this.level(level).cmp(pos.level(level))) {
      case 1:
        return 1
      case -1:
        return -1
      case 0:
        return this.cmp_level(pos, level + 1)
      default:
        return 0
    }
  }
  cmp(pos: LogootishPosition): CompareResult {
    return this.cmp_level(pos, 0)
  }

  /**
   * Return this position if it is between `min` or `max`, otherwise return
   * `min` if this is less and `max` if this is greater.
   * @param min - The minimum output.
   * @param max - The maximum output.
   * @param preserve_levels - If defined, the output number of levels will be
   * equal to `preserve_levels`.
   * @returns Either this position, min, or max. It is **not** copied, so if you
   * want to modify it, you should copy it.
   */
  clamp(
    min: LogootishPosition,
    max: LogootishPosition,
    preserve_levels?: undefined | number
  ): LogootishPosition {
    const clamped = this.cmp(min) < 0 ? min : this.cmp(max) > 0 ? max : this
    if (preserve_levels !== undefined) {
      return clamped.equivalentPositionAtLevel(preserve_levels)
    } else {
      return clamped.copy()
    }
  }

  toString(): string {
    let str = '['
    this.array.forEach((el, i, a) => {
      str += el.toString() + (i >= a.length - 1 ? '' : ',')
    })
    str += ']'
    return str
  }
}
namespace LogootishPosition {
  export type JSON = LogootInt.JSON[]
  export namespace JSON {
    export const Schema = { type: 'array', items: LogootInt.JSON.Schema }
  }
}

class BranchOrderInconsistencyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BranchOrderInconsistencyError'
  }
}

class LogootPosition extends Comparable<LogootPosition> {
  protected lp: LogootishPosition = new LogootishPosition()
  protected branch_array: BranchKey[] = []
  readonly branch_order: BranchOrder

  constructor(
    br: BranchKey,
    len = 0,
    readonly start?: LogootPosition,
    readonly end?: LogootPosition,
    branch_order?: BranchOrder
  ) {
    super()
    if (start && end && start.gt(end)) {
      throw new TypeError('Start is greater than end')
    }
    // First, set up the branch order
    if (start && end && start.branch_order !== end.branch_order) {
      throw new BranchOrderInconsistencyError(
        'Start and end do not have the same branch order'
      )
    }
    const existing_branch_order = start?.branch_order || end?.branch_order
    if (!branch_order && (start || end)) {
      branch_order = start?.branch_order || end?.branch_order
    } else if (branch_order && branch_order === existing_branch_order) {
      throw new BranchOrderInconsistencyError(
        'The provided branch order is not the same as the position branch order'
      )
    }
    if (!branch_order) {
      branch_order = new BranchOrder()
    }
    this.branch_order = branch_order
  }

  static fromIntsBranches(
    order: BranchOrder,
    ...els: [number | LogootInt, BranchKey][]
  ) {
    const lp = new LogootPosition(els[0][1], 0, undefined, undefined, order)
    lp.lp = LogootishPosition.fromInts(...els.map(([n]) => n))
    lp.branch_array = els.map(([, b]) => b)
    return lp
  }

  selfTest() {
    if (this.branch_array.length !== this.lp.length) {
      throw new FatalError(
        'LogootPosition array was corrupted. This should never happen.'
      )
    }
  }

  get length() {
    return this.lp.length
  }

  private cmp_level(pos: LogootPosition, level: number): CompareResult {
    if (level >= this.length) {
      if (this.length === pos.length) {
        return 0
      }
      return 1
    }
    if (level >= pos.length) {
      return -1
    }
    const ti = this.branch_order.i(this.branch_array[level])
    const oi = this.branch_order.i(pos.branch_array[level])
    switch (cmpResult(ti - oi)) {
      case 1:
        return 1
      case -1:
        return -1
      case 0:
        switch (this.lp.l(level).cmp(pos.lp.l(level))) {
          case 1:
            return 1
          case -1:
            return -1
          case 0:
            return this.cmp_level(pos, level + 1)
          default:
            break
        }
      default:
        break
    }
    // TODO: Throw some kind of error
    return 0
  }

  cmp(pos: LogootPosition): CompareResult {
    return this.cmp_level(pos, 0)
  }

  toString() {
    // Corruption can cause some seriously weird errors here. If the user is
    // `console.log`ging stuff, then it's probably fine to do a quick self test
    this.selfTest()
    const bstr = this.branch_array.map((br) => br.toString())
    return `[${bstr.map((br, i) => `(${this.lp.level(i)},${br})`)}]`
  }
}

export { LogootPosition, LogootishPosition }
