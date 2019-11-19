// Like the built-in map function, but it replaces the element with an arbitrary
// number of elements, making it a combination of map, push, and filter
function arraymap<T>(array: T[], fn: (el: T) => T[]): T[] {
  for (let i = 0; i < array.length; ) {
    const newarray = fn(array[i])
    array.splice(i, 1, ...newarray)
    i += newarray.length ? newarray.length : 1
  }
  return array
}

class PeekableIterator<T> {
  i = 0
  array: T[]
  constructor(array: T[]) {
    this.array = array
  }

  next(): { value: T, done: Boolean } {
    const obj = this.peek()
    this.i++
    return obj
  }
  peek(): { value: T, done: Boolean } {
    return {
      value: this.array[this.i],
      done: this.i >= this.array.length
    }
  }
}

// Errors that indicate a corrupt document and require client shutdown
// This class only exists to make code look pretty
class FatalError extends Error {
  fatal: boolean = true
}

type CompareResult = -1 | 0 | 1
type CompareFunction<T> = (other: T) => CompareResult
type DualCompareFunction<T> = (a: T, b: T) => CompareResult

abstract class Comparable<T> {
  abstract cmp(other: T): CompareResult
  gt(n: T) : Boolean {
    return this.cmp(n) === 1
  }
  gteq(n: T): Boolean {
    return this.cmp(n) >= 0
  }
  eq(n: T): Boolean {
    return this.cmp(n) === 0
  }
  lteq(n: T): Boolean {
    return this.cmp(n) <= 0
  }
  lt(n: T): Boolean {
    return this.cmp(n) === -1
  }
}

class MemberPtr<T, K extends keyof T> {
  obj: T
  key: K
  constructor(obj: T, key: K) {
    this.obj = obj
    this.key = key
  }
  get value(): T[K] {
    return this.obj[this.key]
  }
  set value(val: T[K]) {
    this.obj[this.key] = val
  }
}

export {
  arraymap,
  PeekableIterator,
  FatalError,
  CompareResult,
  CompareFunction,
  DualCompareFunction,
  Comparable,
  MemberPtr
}
