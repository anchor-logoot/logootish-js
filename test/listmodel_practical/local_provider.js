/**
 * Provides a fake local document copy that can be used in ordering tests. This
 * is pretty terrible code since I was trying to whip something together
 * quickly...
 */

class DummyContext {
  constructor() {
    this.lookup = {}
  }
  provideDataFor(op) {
    if (op.type === 0) {
      if (!this.lookup[op.br]) {
        this.lookup[op.br] = {}
      }
      const brdata = this.lookup[op.br]
      if (!brdata[op.rclk.toString()]) {
        brdata[op.rclk.toString()] = {}
      }
      const clkdata = brdata[op.rclk.toString()]

      return [...Array(op.length).keys()].map((i) => {
        const k = op.start.offsetLowest(i).toString()
        if (!clkdata[k]) {
          clkdata[k] = Symbol(
            `From event on ${op.br} at ${op.start} element ${i} @ ${op.rclk}`
          )
        }
        return clkdata[k]
      })
    }
  }
}

class DummyCopy {
  constructor(ctx, ldm, br_order) {
    this.ctx = ctx
    this.ldm = ldm
    if (br_order) {
      this.ldm.branch_order = br_order
    }
    this.elements = []
  }
  applyOperation(op) {
    const data = this.ctx.provideDataFor(op)
    const nomutate_start = op.start.copy()
    const nomutate_rclk = op.rclk.copy()
    const ops = this.ldm._mergeNode(
      op.br,
      nomutate_start,
      op.length,
      nomutate_rclk,
      op.type,
      this.ldm.canJoin
    )
    if (op.start.cmp(nomutate_start)) {
      throw new Error('Algorithm mutated input start position')
    }
    if (op.rclk.cmp(nomutate_rclk)) {
      throw new Error('Algorithm mutated rclk')
    }
    ops.forEach(({ type, start, length, offset, conflicting, source, dest }) => {
      if (type === 'i') {
        if (start > this.elements.length) {
          throw new Error('Algorithm provided out-of-bounds insertion')
        }
        const datasc = data.slice(offset, offset + length)
        if (datasc.length !== length) {
          console.log(data, length, datasc)
          throw new Error(
            'Algorithm provided out-of-range sections of source data'
          )
        }
        this.elements.splice(start, 0, ...datasc)
      } else if (type === 'r') {
        const removed = this.elements.splice(start, length)
        if (removed.length !== length) {
          throw new Error(
            'Algorithm provided out-of-range removal'
          )
        }
      } else if (type === 't') {
        const els = this.elements.splice(source, length)
        if (els.length !== length) {
          throw new Error(
            'Algorithm provided out-of-range source translation'
          )
        }
        if (dest > this.elements.length) {
          throw new Error(
            'Algorithm provided out-of-range destination translation'
          )
        }
        this.elements.splice(dest, 0, ...els)
      } else if (type === 'm') {
        // TODO
      } else {
        throw new Error(
          `Algorithm provided invalid type ${type}`
        )
      }
    })
  }
  doc_eq(other) {
    return this.elements.every((e, i) => e === other.elements[i])
  }
}


module.exports = { DummyContext, DummyCopy }