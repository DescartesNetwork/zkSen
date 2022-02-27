import { assert, expect } from 'chai'
import { Point } from '../lib/point'
import { PointVector, ScalarVector } from '../lib/vectors'

const SCALAR_VECTOR = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]
const POINT_VECTOR = SCALAR_VECTOR.map((scalar) => Point.BASE.multiply(scalar))

describe('scalar vectors', function () {
  let v: ScalarVector

  it('new', () => {
    v = new ScalarVector(SCALAR_VECTOR)
    assert.deepEqual(SCALAR_VECTOR, v.value)
  })

  it('left', () => {
    const vL = new ScalarVector(
      SCALAR_VECTOR.slice(0, SCALAR_VECTOR.length / 2),
    )
    expect(v.left.equals(vL)).true
  })

  it('right', () => {
    const vR = new ScalarVector(SCALAR_VECTOR.slice(SCALAR_VECTOR.length / 2))
    expect(v.right.equals(vR)).true
  })

  it('add scalar vector', () => {
    const doubleV = new ScalarVector(SCALAR_VECTOR.map((e) => e * 2n))
    expect(v.addScalarVector(v).equals(doubleV)).true
  })

  it('mul scalar', () => {
    const doubleV = new ScalarVector(SCALAR_VECTOR.map((e) => e * 2n))
    expect(v.mulScalar(2n).equals(doubleV)).true
  })

  it('mul point vector', () => {
    const point = Point.BASE.multiply(
      SCALAR_VECTOR.map((e) => e ** 2n).reduce((m, n) => m + n),
    )
    const pointVector = new PointVector(POINT_VECTOR)
    expect(v.mulPointVector(pointVector).equals(point)).true
  })
})

describe('point vectors', function () {
  let v: PointVector

  it('new', async () => {
    v = new PointVector(POINT_VECTOR)
    assert.deepEqual(POINT_VECTOR, v.value)
  })

  it('left', () => {
    const vL = new PointVector(POINT_VECTOR.slice(0, POINT_VECTOR.length / 2))
    expect(v.left.equals(vL)).true
  })

  it('right', () => {
    const vR = new PointVector(POINT_VECTOR.slice(POINT_VECTOR.length / 2))
    expect(v.right.equals(vR)).true
  })

  it('add point vector', () => {
    const doubleVector = new PointVector(v.value.map((e) => e.multiply(2n)))
    expect(v.addPointVector(v).equals(doubleVector)).true
  })

  it('mul scalar', () => {
    const doubleVector = new PointVector(v.value.map((e) => e.multiply(2n)))
    expect(v.mulScalar(2n).equals(doubleVector)).true
  })

  it('mul scalar vector', () => {
    const point = Point.BASE.multiply(
      SCALAR_VECTOR.map((e) => e ** 2n).reduce((m, n) => m + n),
    )
    const scalarVector = new ScalarVector(SCALAR_VECTOR)
    expect(v.mulScalarVector(scalarVector).equals(point)).true
  })
})
