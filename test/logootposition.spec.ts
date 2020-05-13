import { expect } from 'chai'
import { BranchOrder } from '../src/listmodel/branch'
import { LogootishPosition, LogootPosition } from '../src/listmodel/position'
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
})