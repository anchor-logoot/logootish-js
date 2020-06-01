import 'regenerator-runtime/runtime'

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
  array: LogootInt[] = [new LogootInt(0)]
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
  iterator(): IterableIterator<LogootInt> {
    return this.array.values()
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

function positionsCompatible(s: LogootPosition, e: LogootPosition): boolean {
  if (s.length > e.length) {
    s = s.copy().truncateTo(e.length)
  } else if (e.length > s.length) {
    e = e.copy().truncateTo(s.length)
  }
  return s.lteq(e)
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
    if (start && end && !positionsCompatible(start, end)) {
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
    } else if (
      branch_order &&
      existing_branch_order &&
      branch_order !== existing_branch_order
    ) {
      throw new BranchOrderInconsistencyError(
        'The provided branch order is not the same as the position branch order'
      )
    }
    if (!branch_order) {
      branch_order = new BranchOrder()
    }
    this.branch_order = branch_order

    const tgt_i = branch_order.i(br)
    let done = false
    const itstart = start
      ? start.iterator()
      : (function* (): IterableIterator<[LogootInt, BranchKey]> {
          return
        })()
    const itend = end
      ? end.iterator()
      : (function* (): IterableIterator<[LogootInt, BranchKey]> {
          return
        })()
    let nstart, nend

    this.branch_array.length = 0
    this.lp.array.length = 0

    while (!done) {
      if (!nstart || !nstart.done) {
        nstart = itstart.next()
      }
      if (!nend || !nend.done) {
        nend = itend.next()
      }

      const bs = nstart.value ? branch_order.i(nstart.value[1]) : -Infinity
      const be = nend.value ? branch_order.i(nend.value[1]) : Infinity
      if (bs > tgt_i || be < tgt_i) {
        // The target branch is not in the available range; Move on
        if (!nstart.value) {
          this.branch_array.push(nend.value[1])
          this.lp.array.push(nend.value[0].copy())
        } else {
          this.branch_array.push(nstart.value[1])
          const int = nstart.value[0].copy()
          this.lp.array.push(int)
        }
      } else {
        if (bs === be) {
          // So now we have to allocate between linear numbers just like a
          // classic `LogootishPositon`
          this.branch_array.push(nstart.value[1])
          if (nstart.value[0].copy().add(len).lteq(nend.value[0])) {
            // There's enough space to cram the target data in here; We're done
            done = true
          }
          this.lp.array.push(nstart.value[0].copy())
        } else {
          // Since we can allocate on our own branch, there's technically
          // infinite space.
          if (bs === tgt_i) {
            this.branch_array.push(br)
            this.lp.array.push(nstart.value[0].copy())
          } else if (be === tgt_i) {
            this.branch_array.push(br)
            this.lp.array.push(nend.value[0].copy().sub(len))
          } else {
            this.branch_array.push(br)
            this.lp.array.push(new LogootInt(0))
          }
          // ...and we're done here
          done = true
        }
      }
    }
  }

  static fromIntsBranches(
    order: BranchOrder,
    ...els: [number | LogootInt, BranchKey][]
  ): LogootPosition {
    const lp = new LogootPosition(els[0][1], 0, undefined, undefined, order)
    lp.lp = LogootishPosition.fromInts(...els.map(([n]) => n))
    lp.branch_array = els.map(([, b]) => b)
    return lp
  }

  copy(): LogootPosition {
    const lp = new LogootPosition(
      this.branch_order.b(0),
      0,
      undefined,
      undefined,
      this.branch_order
    )
    lp.branch_array = this.branch_array.map((k) => k)
    lp.lp = this.lp.copy()
    return lp
  }

  selfTest(): void {
    if (this.branch_array.length !== this.lp.length) {
      throw new FatalError(
        'LogootPosition array was corrupted. This should never happen.'
      )
    }
  }

  get length(): number {
    return this.lp.length
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

  *iterator(): IterableIterator<[LogootInt, BranchKey]> {
    const n_iter = this.lp.iterator()
    const b_iter = this.branch_array.values()
    let n
    let b
    while (true) {
      n = n_iter.next()
      b = b_iter.next()
      if (n.done && b.done) {
        return
      } else if (n.done !== b.done) {
        throw new FatalError(
          'LogootPosition array was corrupted. This should never happen.'
        )
      }
      yield [n.value, b.value]
    }
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
        }
    }
    // TODO: Throw some kind of error
  }

  cmp(pos: LogootPosition): CompareResult {
    return this.cmp_level(pos, 0)
  }

  l(l: number): [LogootInt, BranchKey] {
    return [this.lp.l(l), this.branch_array[l]]
  }
  offsetLowest(n: number): LogootPosition {
    const lp = this.copy()
    lp.lp = lp.lp.offsetLowest(n)
    return lp
  }
  inverseOffsetLowest(n: number): LogootPosition {
    const lp = this.copy()
    lp.lp = lp.lp.inverseOffsetLowest(n)
    return lp
  }

  truncateTo(level: number): LogootPosition {
    if (this.branch_array.length < level) {
      throw new TypeError('Truncate cannot add levels')
    }
    if (level < 1) {
      throw new TypeError('Cannot truncate to a level less than 1')
    }
    this.branch_array.length = level
    this.lp.array.length = level
    return this
  }

  equalsHigherLevel(to: LogootPosition) {
    return to.length < this.length && this.copy().truncateTo(to.length).eq(to)
  }

  toJSON(): LogootPosition.JSON {
    const jb = (b: BranchKey): string | number => {
      if (typeof b === 'symbol') {
        throw new TypeError('Cannot convert Symbol to JSON')
      } else {
        return b
      }
    }
    return this.branch_array.map((br, i) => ([this.lp.l(i).toJSON(), jb(br)]))
  }

  toString(): string {
    // Corruption can cause some seriously weird errors here. If the user is
    // `console.log`ging stuff, then it's probably fine to do a quick self test
    this.selfTest()
    const bstr = this.branch_array.map((br) => br.toString())
    return `[${bstr.map((br, i) => `(${this.lp.level(i)},${br})`)}]`
  }
}
namespace LogootPosition {
  export type JSON = [LogootInt.JSON, number | string][]
  export namespace JSON {
    export const Schema = {
      type: 'array',
      items: {
        type: 'array',
        items: [
          LogootInt.JSON.Schema,
          { type: ['number', 'string'] }
        ]
      }
    }
  }
}

export { LogootPosition, BranchOrderInconsistencyError, LogootishPosition }
