import { expect } from 'chai'
import { ImmutableInt, Int32, ImmutableError } from '../src/ints'

describe('Int32', () => {
  it('js_int accessor works', () => {
    const a = new Int32(5)
    expect(a.js_int).to.be.equal(5)
  })
  it('fromJSON', () => {
    const a = Int32.fromJSON(5)
    expect(a.js_int).to.be.equal(5)
  })
  it('toJSON', () => {
    const a = new Int32(5)
    expect(a.toJSON()).to.be.equal(5)
  })
  it('toString', () => {
    const a = new Int32(5)
    expect(a.toString()).to.be.equal('5')
  })
  it('assignment', () => {
    const a = new Int32(5)
    const b = new Int32(4)
    a.assign(b)
    b.assign(3)
    expect(a.js_int).to.be.equal(4)
    expect(b.js_int).to.be.equal(3)
  })
  it('copy', () => {
    const a = new Int32(5)
    const b = a.copy()
    a.assign(20)
    expect(a.js_int).to.be.equal(20)
    expect(b.js_int).to.be.equal(5)
  })
  it('constructor copy', () => {
    const a = new Int32(5)
    const b = new Int32(a)
    a.assign(20)
    expect(a.js_int).to.be.equal(20)
    expect(b.js_int).to.be.equal(5)
  })
  it('compare number', () => {
    const a = Int32.fromJSON(5)
    expect(a.cmp(5)).to.be.equal(0)
    expect(a.cmp(-20)).to.be.equal(1)
    expect(a.cmp(9000)).to.be.equal(-1)
  })
  it('compare Int32', () => {
    const a = Int32.fromJSON(5)
    expect(a.cmp(new Int32(5))).to.be.equal(0)
    expect(a.cmp(new Int32(-20))).to.be.equal(1)
    expect(a.cmp(new Int32(9000))).to.be.equal(-1)
  })
  it('compare immutable Int32', () => {
    const a = Int32.fromJSON(5)
    expect(a.cmp(new Int32(5).i)).to.be.equal(0)
    expect(a.cmp(new Int32(-20).i)).to.be.equal(1)
    expect(a.cmp(new Int32(9000).i)).to.be.equal(-1)
  })
  it('add', () => {
    const a = new Int32(5)
    const b = new Int32(3)
    a.add(b)
    a.add(3)
    expect(a.js_int).to.be.equal(11)
    expect(b.js_int).to.be.equal(3)
  })
  it('sub', () => {
    const a = new Int32(5)
    const b = new Int32(3)
    a.sub(b)
    a.sub(3)
    expect(a.js_int).to.be.equal(-1)
    expect(b.js_int).to.be.equal(3)
  })
  it('immutable getter', () => {
    const a = new Int32(5)
    expect(a.i).to.be.an.instanceof(ImmutableInt)
  })
})

describe('ImmutableInt', () => {
  it('js_int accessor works', () => {
    const a = new Int32(5).i
    expect(a.js_int).to.be.equal(5)
  })
  it('toJSON', () => {
    const a = new Int32(5).i
    expect(a.toJSON()).to.be.equal(5)
  })
  it('toString', () => {
    const a = new Int32(5).i
    expect(a.toString()).to.be.equal('5')
  })
  it('assignment fails', () => {
    const a = new Int32(5).i
    const b = new Int32(4).i
    expect(() => a.assign(b)).to.throw(ImmutableError)
  })
  it('copy can be modified', () => {
    const a = new Int32(5).i
    const b = a.copy()
    b.assign(20)
    expect(a.js_int).to.be.equal(5)
    expect(b.js_int).to.be.equal(20)
  })
  it('constructor copy can be modified', () => {
    const a = new Int32(5).i
    const b = new Int32(a)
    b.assign(20)
    expect(a.js_int).to.be.equal(5)
    expect(b.js_int).to.be.equal(20)
  })
  it('compare number', () => {
    const a = Int32.fromJSON(5).i
    expect(a.cmp(5)).to.be.equal(0)
    expect(a.cmp(-20)).to.be.equal(1)
    expect(a.cmp(9000)).to.be.equal(-1)
  })
  it('compare Int32', () => {
    const a = Int32.fromJSON(5).i
    expect(a.cmp(new Int32(5))).to.be.equal(0)
    expect(a.cmp(new Int32(-20))).to.be.equal(1)
    expect(a.cmp(new Int32(9000))).to.be.equal(-1)
  })
  it('compare immutable Int32', () => {
    const a = Int32.fromJSON(5).i
    expect(a.cmp(new Int32(5).i)).to.be.equal(0)
    expect(a.cmp(new Int32(-20).i)).to.be.equal(1)
    expect(a.cmp(new Int32(9000).i)).to.be.equal(-1)
  })
  it('add fails', () => {
    const a = new Int32(5).i
    const b = new Int32(4).i
    expect(() => a.add(b)).to.throw(ImmutableError)
    expect(() => a.add(4)).to.throw(ImmutableError)
  })
  it('sub fails', () => {
    const a = new Int32(5).i
    const b = new Int32(4).i
    expect(() => a.sub(b)).to.throw(ImmutableError)
    expect(() => a.sub(4)).to.throw(ImmutableError)
  })
  it('immutable getter', () => {
    const a = new Int32(5).i
    expect(a.i).to.be.an.instanceof(ImmutableInt)
  })
})