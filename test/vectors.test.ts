import { Point } from '@noble/ed25519'
import { assert } from 'chai'
import { PointVector, ScalarVector } from '../lib/vectors'

const SCALAR_VECTOR = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]
const POINT_VECTOR = SCALAR_VECTOR.map((scalar) => Point.BASE.multiply(scalar))

describe('scalar vectors', function () {
  let v: ScalarVector

  it('new', () => {
    v = new ScalarVector(SCALAR_VECTOR)
    assert.deepEqual(SCALAR_VECTOR, v.vector)
  })

  it('left', () => {
    const vL = SCALAR_VECTOR.slice(0, SCALAR_VECTOR.length / 2)
    assert.deepEqual(v.left.vector, vL)
  })

  it('right', () => {
    const vR = SCALAR_VECTOR.slice(SCALAR_VECTOR.length / 2)
    assert.deepEqual(v.right.vector, vR)
  })

  it('add scalar vector', () => {
    const doubleV = SCALAR_VECTOR.map((e) => e * 2n)
    assert.deepEqual(v.addScalarVector(v).vector, doubleV)
  })

  it('mul scalar', () => {
    const doubleV = SCALAR_VECTOR.map((e) => e * 2n)
    assert.deepEqual(v.mulScalar(2n).vector, doubleV)
  })

  it('mul point vector', () => {
    const point = Point.BASE.multiply(
      SCALAR_VECTOR.map((e) => e ** 2n).reduce((m, n) => m + n),
    )
    const pointVector = new PointVector(POINT_VECTOR)
    assert.deepEqual(v.mulPointVector(pointVector), point)
  })
})

describe('point vectors', function () {
  let v: PointVector

  it('new', async () => {
    v = new PointVector(POINT_VECTOR)
    assert.deepEqual(POINT_VECTOR, v.vector)
  })

  it('left', () => {
    const vL = new PointVector(POINT_VECTOR.slice(0, POINT_VECTOR.length / 2))
    assert.deepEqual(v.left.vector, vL.vector)
  })

  it('right', () => {
    const vR = new PointVector(POINT_VECTOR.slice(POINT_VECTOR.length / 2))
    assert.deepEqual(v.right.vector, vR.vector)
  })

  it('add point vector', () => {
    const doubleVector = v.vector.map((e) => e.multiply(2n))
    assert.deepEqual(v.addPointVector(v).vector, doubleVector)
  })

  it('mul scalar', () => {
    const doubleVector = v.vector.map((e) => e.multiply(2n))
    assert.deepEqual(v.mulScalar(2n).vector, doubleVector)
  })

  it('mul scalar vector', () => {
    const point = Point.BASE.multiply(
      SCALAR_VECTOR.map((e) => e ** 2n).reduce((m, n) => m + n),
    )
    const scalarVector = new ScalarVector(SCALAR_VECTOR)
    assert.deepEqual(v.mulScalarVector(scalarVector), point)
  })
})
