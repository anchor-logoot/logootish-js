import { expect } from 'chai'
import { LogootishPosition } from '../src/listmodel/position'

describe('LogootishPosition', () => {
  it('should default to [0]', () => {
    const pos = new LogootishPosition()
    expect(pos.levels).to.be.equal(0)
    expect(pos.level(0).js_int).to.be.equal(0)
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
      it('should allocate more levels than just 2', () => {
        const pos = LogootishPosition.fromInts(1, 2)
        const pos2 = new LogootishPosition(1, pos, pos)
        expect(pos2.levels).to.be.equal(2)
        expect(pos2.level(0).js_int).to.be.equal(1)
        expect(pos2.level(1).js_int).to.be.equal(2)
        expect(pos2.level(2).js_int).to.be.equal(0)
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
