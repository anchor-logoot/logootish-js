import { expect } from 'chai'
import { BranchOrder } from '../src/listmodel/branch'
import {
  LogootishPosition,
  BranchOrderInconsistencyError,
  LogootPosition
} from '../src/listmodel/position'
import { ImmutableInt } from '../src/ints'

describe('LogootishPosition', () => {
  it('should default to [0]', () => {
    const pos = new LogootishPosition()
    expect(pos.levels).to.be.equal(0)
    expect(pos.level(0).js_int).to.be.equal(0)
  })

  describe('compare function works', () => {
    it('linear order', () => {
      const pos = LogootishPosition.fromInts(-6, 0)
      const pos2 = LogootishPosition.fromInts(9000, 0)
      const pos3 = LogootishPosition.fromInts(-6, 0)
      expect(pos.cmp(pos2)).to.be.equal(-1)
      expect(pos2.cmp(pos3)).to.be.equal(1)
      expect(pos3.cmp(pos)).to.be.equal(0)
    })
    it('linear order on lower level', () => {
      const pos = LogootishPosition.fromInts(0, -6)
      const pos2 = LogootishPosition.fromInts(0, 9000)
      const pos3 = LogootishPosition.fromInts(0, -6)
      expect(pos.cmp(pos2)).to.be.equal(-1)
      expect(pos2.cmp(pos3)).to.be.equal(1)
      expect(pos3.cmp(pos)).to.be.equal(0)
    })
    it('more levels come first', () => {
      const pos = LogootishPosition.fromInts(1, 2, 3)
      const pos2 = LogootishPosition.fromInts(1, 2)
      expect(pos.cmp(pos2)).to.be.equal(-1)
      expect(pos2.cmp(pos)).to.be.equal(1)
    })
  })

  describe('encode/decode', () => {
    it('fromJSON', () => {
      const pos = LogootishPosition.fromJSON([1, 2, 3])
      const pos2 = LogootishPosition.fromInts(1, 2, 3)
      expect(pos.cmp(pos2)).to.be.equal(0)
    })
    it('toJSON', () => {
      const json = LogootishPosition.fromInts(1, 2, 3).toJSON()
      expect(json).to.be.deep.equal([1, 2, 3])
    })
    it('toString', () => {
      const str = LogootishPosition.fromInts(1, 2, 3).toString()
      expect(str).to.be.equal('[1,2,3]')
    })
  })

  describe('level accessor', () => {
    it('basic access', () => {
      const pos = LogootishPosition.fromInts(1, 2, 3)
      expect(pos.level(0).js_int).to.be.equal(1)
      expect(pos.level(1).js_int).to.be.equal(2)
      expect(pos.level(2).js_int).to.be.equal(3)
      expect(pos.l(0).js_int).to.be.equal(1)
      expect(pos.l(1).js_int).to.be.equal(2)
      expect(pos.l(2).js_int).to.be.equal(3)
    })
  })

  describe('clamping', () => {
    it('below min', () => {
      const min = LogootishPosition.fromInts(1, 1)
      const max = LogootishPosition.fromInts(1, 5)
      const pos = LogootishPosition.fromInts(0)
      const expected = LogootishPosition.fromInts(1, 1)
      expect(pos.clamp(min, max).cmp(expected)).to.be.equal(0)
    })
    it('above max', () => {
      const min = LogootishPosition.fromInts(1, 1)
      const max = LogootishPosition.fromInts(1, 5)
      const pos = LogootishPosition.fromInts(1)
      const expected = LogootishPosition.fromInts(1, 5)
      expect(pos.clamp(min, max).cmp(expected)).to.be.equal(0)
    })
    it('in range', () => {
      const min = LogootishPosition.fromInts(1, 1)
      const max = LogootishPosition.fromInts(1, 5)
      const pos = LogootishPosition.fromInts(1, 2, 3)
      expect(pos.clamp(min, max).cmp(pos)).to.be.equal(0)
    })
    it('preserving levels', () => {
      const min = LogootishPosition.fromInts(1, 1)
      const max = LogootishPosition.fromInts(1, 5)
      const pos = LogootishPosition.fromInts(1, 2, 3)
      const expected = LogootishPosition.fromInts(1, 2)
      expect(pos.clamp(min, max, 1).cmp(expected)).to.be.equal(0)
    })
  })

  describe('immutable mode', () => {
    it('returned LIs should be mutable when immutability is off', () => {
      const pos = new LogootishPosition()
      expect(pos.l(0)).to.not.be.an.instanceof(ImmutableInt)
    })
    it('returned LIs should be immutable when immutability is on', () => {
      const pos = new LogootishPosition()
      pos.immutable = true
      expect(pos.l(0)).to.be.an.instanceof(ImmutableInt)
    })
  })

  describe('offsets, levels=0', () => {
    it('should return new position with positive offset', () => {
      const pos = new LogootishPosition()
      const pos2 = pos.offsetLowest(1)
      expect(pos2.levels).to.be.equal(0)
      expect(pos2.level(0).js_int).to.be.equal(1)
      expect(pos.level(0).js_int).to.be.equal(0)
    })
    it('should return new position with negative offset', () => {
      const pos = new LogootishPosition()
      const pos2 = pos.inverseOffsetLowest(1)
      expect(pos2.levels).to.be.equal(0)
      expect(pos2.level(0).js_int).to.be.equal(-1)
      expect(pos.level(0).js_int).to.be.equal(0)
    })
  })

  describe('creation', () => {
    it('should allocate after position correctly', () => {
      const pos = LogootishPosition.fromInts(1)
      const pos2 = new LogootishPosition(1, pos)
      expect(pos2.levels).to.be.equal(0)
      expect(pos2.level(0).js_int).to.be.equal(1)
    })
    it('should allocate before position correctly', () => {
      const pos = LogootishPosition.fromInts(1)
      const pos2 = new LogootishPosition(2, undefined, pos)
      expect(pos2.levels).to.be.equal(0)
      expect(pos2.level(0).js_int).to.be.equal(-1)
    })
    describe('between-node allocation', () => {
      it('a start that is greater than the end should throw an error', () => {
        const pos = LogootishPosition.fromInts(1)
        const pos2 = LogootishPosition.fromInts(2)
        expect(() => new LogootishPosition(1, pos2, pos))
          .to.throw(TypeError, 'Start is greater than end')
      })
      it('should allocate more levels than just 2', () => {
        const pos = LogootishPosition.fromInts(1, 2)
        const pos2 = new LogootishPosition(1, pos, pos)
        expect(pos2.levels).to.be.equal(2)
        expect(pos2.level(0).js_int).to.be.equal(1)
        expect(pos2.level(1).js_int).to.be.equal(2)
        expect(pos2.level(2).js_int).to.be.equal(0)
      })
      it('should allocate in higher available space', () => {
        const pos = LogootishPosition.fromInts(0, 0, 0)
        const pos2 = LogootishPosition.fromInts(0, 1, 0)
        const pos3 = new LogootishPosition(1, pos, pos2)
        expect(pos3.levels).to.be.equal(1)
        expect(pos3.level(0).js_int).to.be.equal(0)
        expect(pos3.level(1).js_int).to.be.equal(0)
      })
      it('should allocate before nested unrestricted end', () => {
        const pos = LogootishPosition.fromInts(0)
        const pos2 = LogootishPosition.fromInts(1, 1)
        const pos3 = new LogootishPosition(5, pos, pos2)
        expect(pos3.levels).to.be.equal(1)
        expect(pos3.level(0).js_int).to.be.equal(0)
        expect(pos3.level(1).js_int).to.be.equal(-4)
      })
      it('should allocate after nested unrestricted start', () => {
        const pos = LogootishPosition.fromInts(0, 1)
        const pos2 = LogootishPosition.fromInts(0)
        const pos3 = new LogootishPosition(5, pos, pos2)
        expect(pos3.levels).to.be.equal(1)
        expect(pos3.level(0).js_int).to.be.equal(0)
        expect(pos3.level(1).js_int).to.be.equal(1)
      })
    })
  })

  describe('offsets, more levels', () => {
    it('should return new position with positive offset', () => {
      const pos = LogootishPosition.fromInts(0, 0)
      const pos2 = pos.offsetLowest(1)
      expect(pos2.levels).to.be.equal(1)
      expect(pos2.level(0).js_int).to.be.equal(0)
      expect(pos2.level(1).js_int).to.be.equal(1)
    })
    it('should return new position with negative offset', () => {
      const pos = LogootishPosition.fromInts(0, 0)
      const pos2 = pos.inverseOffsetLowest(1)
      expect(pos2.levels).to.be.equal(1)
      expect(pos2.level(0).js_int).to.be.equal(0)
      expect(pos2.level(1).js_int).to.be.equal(-1)
    })
  })
})

describe('LogootPosition', () => {
  const u1 = 'U1'
  const u2 = 'U2'
  const u3 = 'U3'
  let o: BranchOrder

  beforeEach('setup order', () => {
    o = new BranchOrder()
    o.i(u1)
    o.i(u2)
    o.i(u3)
  })

  it('iterator should work', () => {
    const it = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [3, u3]).iterator()
    let value, done

    ;({value, done} = it.next())
    expect(done).to.be.equal(false)
    expect(value[0].js_int).to.be.equal(1)
    expect(value[1]).to.be.equal(u1)

    ;({value, done} = it.next())
    expect(done).to.be.equal(false)
    expect(value[0].js_int).to.be.equal(2)
    expect(value[1]).to.be.equal(u2)

    ;({value, done} = it.next())
    expect(done).to.be.equal(false)
    expect(value[0].js_int).to.be.equal(3)
    expect(value[1]).to.be.equal(u3)

    ;({value, done} = it.next())
    expect(done).to.be.equal(true)
  })

  it('self test should work', () => {
    class CorruptLP extends LogootPosition {
      constructor() {
        super(u1, 1)
        this.branch_array.push(u2)
      }
    }
    expect(() => new CorruptLP().selfTest(), 'Main self-test failed')
      .to.throw()
    expect(() => {
      const it = new CorruptLP().iterator()
      it.next()
      it.next()
    }, 'Iterator self-test failed').to.throw()
  })
  it('toString should work', () => {
    const str = LogootPosition.fromIntsBranches(
      o,
      [1, u1],
      [2, u2],
      [3, u3]
    ).toString()
    expect(str).to.be.equal('[(1,U1),(2,U2),(3,U3)]')
  })

  describe('compare', () => {
    it('simple numeric linear', () => {
      const pos = LogootPosition.fromIntsBranches(o, [-6, u1])
      const pos2 = LogootPosition.fromIntsBranches(o, [9000, u1])
      const pos3 = LogootPosition.fromIntsBranches(o, [-6, u1])
      expect(pos.cmp(pos2)).to.be.equal(-1)
      expect(pos2.cmp(pos3)).to.be.equal(1)
      expect(pos3.cmp(pos)).to.be.equal(0)
    })
    it('simple branch linear', () => {
      const pos = LogootPosition.fromIntsBranches(o, [42, u1])
      const pos2 = LogootPosition.fromIntsBranches(o, [-20, u2])
      const pos3 = LogootPosition.fromIntsBranches(o, [42, u1])
      expect(pos.cmp(pos2)).to.be.equal(-1)
      expect(pos2.cmp(pos3)).to.be.equal(1)
      expect(pos3.cmp(pos)).to.be.equal(0)
    })
    it('lower levels come first', () => {
      const pos = LogootPosition.fromIntsBranches(o, [-9000, u1])
      const pos2 = LogootPosition.fromIntsBranches(o, [-9000, u1], [9000, u2])
      expect(pos.cmp(pos2)).to.be.equal(1)
    })
  })

  describe('creation', () => {
    it('should default to 0 on provided branch', () => {
      const pos = new LogootPosition(u2, 1, undefined, undefined, o)
      const expected = LogootPosition.fromIntsBranches(o, [0, u2])
      expect(pos.cmp(expected)).to.be.equal(0)
    })
    describe('linear sequence', () => {
      it('should correctly allocate after (numeric)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [1, u2])
        const pos2 = new LogootPosition(u2, 1, pos, undefined, o)
        const expected = LogootPosition.fromIntsBranches(o, [1, u2])
        expect(pos2.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate before (numeric)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [5, u2])
        const pos2 = new LogootPosition(u2, 1, undefined, pos, o)
        const expected = LogootPosition.fromIntsBranches(o, [4, u2])
        expect(pos2.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate after (branch)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [9000, u1])
        const pos2 = new LogootPosition(u2, 1, pos, undefined, o)
        const expected = LogootPosition.fromIntsBranches(o, [0, u2])
        expect(pos2.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate before (branch)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [-9000, u3])
        const pos2 = new LogootPosition(u2, 1, undefined, pos, o)
        const expected = LogootPosition.fromIntsBranches(o, [0, u2])
        expect(pos2.cmp(expected)).to.be.equal(0)
      })
    })
    describe('should hop down if position cannot be allocated', () => {
      it('should correctly allocate after (branch)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [5, u3])
        const pos2 = new LogootPosition(u2, 1, pos, undefined, o)
        const expected = LogootPosition.fromIntsBranches(o, [5, u3], [0, u2])
        expect(pos2.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate before (branch)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [-5, u1])
        const pos2 = new LogootPosition(u2, 1, undefined, pos, o)
        const expected = LogootPosition.fromIntsBranches(o, [-5, u1], [0, u2])
        expect(pos2.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate between (numeric)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [4, u2])
        const pos2 = LogootPosition.fromIntsBranches(o, [5, u2])
        const pos3 = new LogootPosition(u2, 2, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(o, [4, u2], [0, u2])
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
      it('should not add additional level if infinite space', () => {
        const pos = LogootPosition.fromIntsBranches(o, [4, u2], [1, u2])
        const pos2 = LogootPosition.fromIntsBranches(o, [5, u2], [20, u2])
        const pos3 = new LogootPosition(u2, 3, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(o, [4, u2], [1, u2])
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate between on different branch', () => {
        const pos = LogootPosition.fromIntsBranches(o, [1, u2])
        const pos2 = LogootPosition.fromIntsBranches(o, [1, u2])
        const pos3 = new LogootPosition(u1, 2, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(o, [1, u2], [0, u1])
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
      it('should not hop down if not necessary', () => {
        const pos = LogootPosition.fromIntsBranches(o, [4, u2])
        const pos2 = LogootPosition.fromIntsBranches(o, [5, u2])
        const pos3 = new LogootPosition(u2, 1, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(o, [4, u2])
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
    })
    describe('nested unrestricted ends', () => {
      it('should correctly allocate after (numeric)', () => {
        const pos = LogootPosition.fromIntsBranches(
          o,
          [0, u1],
          [20, u3],
          [1, u2]
        )
        const pos2 = LogootPosition.fromIntsBranches(o, [0, u1], [20, u3])
        const pos3 = new LogootPosition(u2, 1, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(
          o,
          [0, u1],
          [20, u3],
          [1, u2]
        )
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate before (numeric)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [0, u1], [20, u3])
        const pos2 = LogootPosition.fromIntsBranches(
          o,
          [1, u1],
          [20, u3],
          [5, u2]
        )
        const pos3 = new LogootPosition(u2, 1, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(
          o,
          [0, u1],
          [20, u3],
          [4, u2]
        )
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate after (branch)', () => {
        const pos = LogootPosition.fromIntsBranches(
          o,
          [0, u1],
          [20, u3],
          [1, u3]
        )
        const pos2 = LogootPosition.fromIntsBranches(o, [0, u1], [20, u3])
        const pos3 = new LogootPosition(u2, 1, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(
          o,
          [0, u1],
          [20, u3],
          [1, u3],
          [0, u2]
        )
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
      it('should correctly allocate before (branch)', () => {
        const pos = LogootPosition.fromIntsBranches(o, [0, u1], [20, u3])
        const pos2 = LogootPosition.fromIntsBranches(
          o,
          [1, u1],
          [20, u3],
          [5, u1]
        )
        const pos3 = new LogootPosition(u2, 1, pos, pos2, o)
        const expected = LogootPosition.fromIntsBranches(
          o,
          [0, u1],
          [20, u3],
          [5, u1],
          [0, u2]
        )
        expect(pos3.cmp(expected)).to.be.equal(0)
      })
    })
    describe('constructor branch order inference', () => {
      it('should throw error if start is greater than end', () => {
        expect(() => {
          new LogootPosition(
            u2,
            1,
            LogootPosition.fromIntsBranches(o, [0, u3]),
            LogootPosition.fromIntsBranches(o, [0, u2]),
            o
          )
        }).to.throw(TypeError)
      })
      it('should throw error if start and end do not have same order', () => {
        expect(() => {
          new LogootPosition(
            u2,
            1,
            LogootPosition.fromIntsBranches(o, [0, u2]),
            LogootPosition.fromIntsBranches(new BranchOrder(), [0, u3]),
            o
          )
        }).to.throw(BranchOrderInconsistencyError)
      })
      it('should throw error if start and end do not have same order', () => {
        expect(() => {
          new LogootPosition(
            u2,
            1,
            LogootPosition.fromIntsBranches(o, [0, u2]),
            LogootPosition.fromIntsBranches(new BranchOrder(), [0, u3]),
            o
          )
        }).to.throw(BranchOrderInconsistencyError)
      })
      it('should throw error if order is not the same as that of pos', () => {
        expect(() => {
          new LogootPosition(
            u2,
            1,
            LogootPosition.fromIntsBranches(o, [0, u2]),
            LogootPosition.fromIntsBranches(o, [0, u3]),
            new BranchOrder()
          )
        }).to.throw(BranchOrderInconsistencyError)
      })
      it('should infer order from positions if none provided', () => {
        const new_order = new LogootPosition(
          u2,
          1,
          LogootPosition.fromIntsBranches(o, [0, u2]),
          LogootPosition.fromIntsBranches(o, [0, u3])
        ).branch_order
        expect(new_order).to.be.equal(o)
      })
      it('should create new order if none provided', () => {
        const new_order = new LogootPosition(
          u2,
          1,
          undefined,
          undefined
        ).branch_order
        expect(new_order).to.be.an.instanceOf(BranchOrder)
      })
    })
  })

  describe('modifiers', () => {
    it('offsetLowest', () => {
      const lp = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [3, u3])
      const copy = lp.copy()
      const ex = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [4, u3])
      const offset = lp.offsetLowest(1)
      expect(offset.cmp(ex), 'Offset is not correct').to.be.equal(0)
      expect(lp.cmp(copy), 'Original was mutated').to.be.equal(0)
      expect(offset.branch_order, 'New branch order created')
        .to.be.equal(lp.branch_order)
    })
    it('inverseOffsetLowest', () => {
      const lp = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [3, u3])
      const copy = lp.copy()
      const ex = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [2, u3])
      const offset = lp.inverseOffsetLowest(1)
      expect(offset.cmp(ex), 'Offset is not correct').to.be.equal(0)
      expect(lp.cmp(copy), 'Original was mutated').to.be.equal(0)
      expect(offset.branch_order, 'New branch order created')
        .to.be.equal(lp.branch_order)
    })
    it('truncateTo fails on attempt to add levels', () => {
      const lp = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [3, u3])
      expect(() => lp.truncateTo(20)).to.throw(TypeError)
    })
    it('truncateTo fails on attempt to set levels less than 1', () => {
      const lp = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [3, u3])
      expect(() => lp.truncateTo(0)).to.throw(TypeError)
      expect(() => lp.truncateTo(-100)).to.throw(TypeError)
    })
    it('truncateTo', () => {
      const lp = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2], [3, u3])
      const ex = LogootPosition.fromIntsBranches(o, [1, u1], [2, u2])
      lp.truncateTo(2)
      expect(lp.cmp(ex)).to.be.equal(0)
    })
  })
})