/**
 * A type used to identify a branch. This value should be used to look up a
 * user-presentable name in another map stored outside of `logootish-js`. This
 * is implementation-defined and allows for the broadest possible definition of
 * a branch.
 */
type BranchKey = symbol | string | number

class BranchOrder {
  public readonly order: BranchKey[] = []

  /**
   * Finds the index of `br` and adds it to the order if necessary.
   * @param br The branch to find the index of
   * @return The index of `br`
   */
  i(br: BranchKey) {
    if (!this.order.includes(br)) {
      this.order.push(br)
      return this.order.length - 1
    }
    return this.order.indexOf(br)
  }
  u(index: number): BranchKey {
    return this.order[index]
  }
}

export { BranchKey, BranchOrder }
