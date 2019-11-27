import chai from 'chai'
import {
  LogootInt,
  LogootPosition,
  ListDocumentModel
} from '../dist/logootish-js.js'

chai.expect()

const expect = chai.expect

describe('ListDocumentModel', () => {
  describe('local insert', () => {
    it('single insert, length = 1', () => {
      const m = new ListDocumentModel()
      const { position, length, rclk } = m.insertLocal(0, 1)

      const expected_pos = new LogootPosition()
      expect(position.cmp(expected_pos)).to.equal(0)
      expect(length).to.equal(1)
      expect(rclk.cmp(new LogootInt(0))).to.equal(0)
    })
    it('single insert, length = 0', () => {
      const m = new ListDocumentModel()
      const { position, length, rclk } = m.insertLocal(0, 0)

      const expected_pos = new LogootPosition()
      expect(position.cmp(expected_pos)).to.equal(0)
      expect(length).to.equal(0)
      expect(rclk.cmp(new LogootInt(0))).to.equal(0)
    })
    it('consecutive insert, length = 1', () => {
      const m = new ListDocumentModel()
      const zero_pos = new LogootPosition()
      {
        const { position, length, rclk } = m.insertLocal(0, 1)

        expect(position.cmp(zero_pos)).to.equal(0)
        expect(length).to.equal(1)
        expect(rclk.cmp(new LogootInt(0))).to.equal(0)
      }
      {
        const { position, length, rclk } = m.insertLocal(1, 1)

        expect(position.cmp(zero_pos.offsetLowest(1))).to.equal(0)
        expect(length).to.equal(1)
        expect(rclk.cmp(new LogootInt(0))).to.equal(0)
      }
    })
    it('bordered insert', () => {
      const m = new ListDocumentModel()
      const expected_pos = new LogootPosition()
        .offsetLowest(1)
        .equivalentPositionAtLevel(1)

      m.insertLocal(0, 1)
      m.insertLocal(1, 1)
      {
        const { position, length, rclk } = m.insertLocal(1, 1)

        expect(position.cmp(expected_pos)).to.equal(0)
        expect(length).to.equal(1)
        expect(rclk.cmp(new LogootInt(0))).to.equal(0)
      }
    })
    it('mid-node insert', () => {
      const m = new ListDocumentModel()
      const expected_pos = new LogootPosition()
        .offsetLowest(1)
        .equivalentPositionAtLevel(1)

      m.insertLocal(0, 2)
      {
        const { position, length, rclk } = m.insertLocal(1, 1)

        expect(position.cmp(expected_pos)).to.equal(0)
        expect(length).to.equal(1)
        expect(rclk.cmp(new LogootInt(0))).to.equal(0)
      }
    })
    it('pollution test', () => {
      // Check for objects being modified after they were returned.
      const m = new ListDocumentModel()
      const zpos = new LogootPosition()
      const deep_pos = zpos.offsetLowest(1).equivalentPositionAtLevel(1)
      const deep_pos2 = deep_pos.offsetLowest(1).equivalentPositionAtLevel(2)

      const n1 = m.insertLocal(0, 1)
      const n2 = m.insertLocal(1, 1)
      const n3 = m.insertLocal(1, 2)
      const n4 = m.insertLocal(2, 1)

      expect(n1.position.cmp(zpos)).to.equal(0)
      expect(n1.length).to.equal(1)
      expect(n1.rclk.cmp(new LogootInt(0))).to.equal(0)

      expect(n2.position.cmp(zpos.offsetLowest(1))).to.equal(0)
      expect(n2.length).to.equal(1)
      expect(n2.rclk.cmp(new LogootInt(0))).to.equal(0)

      expect(n3.position.cmp(deep_pos)).to.equal(0)
      expect(n3.length).to.equal(2)
      expect(n3.rclk.cmp(new LogootInt(0))).to.equal(0)

      expect(n4.position.cmp(deep_pos2)).to.equal(0)
      expect(n4.length).to.equal(1)
      expect(n4.rclk.cmp(new LogootInt(0))).to.equal(0)
    })
    it('hello world practical', () => {
      // This is a version of one of my original tests when I was still playing
      // around with the algorithm. I would type `world`, then add `ho `, then
      // add the `ell`. This would pick up most large errors.
      const m = new ListDocumentModel()
      const zpos = new LogootPosition()
      const deep_pos = zpos.inverseOffsetLowest(2).equivalentPositionAtLevel(1)

      const n1 = m.insertLocal(0, 5) // `world`
      const n2 = m.insertLocal(0, 3) // `ho `
      const n3 = m.insertLocal(1, 3) // `ell`

      expect(n1.position.cmp(zpos)).to.equal(0)
      expect(n1.length).to.equal(5)
      expect(n1.rclk.cmp(new LogootInt(0))).to.equal(0)

      expect(n2.position.cmp(zpos.inverseOffsetLowest(3))).to.equal(0)
      expect(n2.length).to.equal(3)
      expect(n2.rclk.cmp(new LogootInt(0))).to.equal(0)

      expect(n3.position.cmp(deep_pos)).to.equal(0)
      expect(n3.length).to.equal(3)
      expect(n3.rclk.cmp(new LogootInt(0))).to.equal(0)
    })
  })
})
