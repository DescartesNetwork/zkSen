import { Point } from '@noble/ed25519'
import { mod } from './utils'

/**
 * Core vector
 */
export abstract class CoreVector<T> {
  private _vector: Array<T>

  constructor(vector: Array<T>) {
    this._vector = vector
  }

  private halfLength = () => {
    if (this.vector.length % 2 === 1)
      throw new Error(
        `Cannot seperate a odd-length vector: ${this.vector.length}`,
      )
    return this.vector.length / 2
  }

  protected compareLength = (other: any) => {
    if (this.vector.length !== other.vector.length)
      throw new Error(
        `The length of 2 vectors don't equal: ${this.vector.length} and ${other.vector.length}`,
      )
    return this.vector.length
  }

  protected abstract wrap(v: Array<T>): this

  get vector() {
    return this._vector
  }

  get left() {
    const halfIndex = this.halfLength()
    return this.wrap(this.vector.slice(0, halfIndex))
  }

  get right() {
    const halfIndex = this.halfLength()
    return this.wrap(this.vector.slice(halfIndex))
  }
}

/**
 * Scalar vector
 */
export class ScalarVector extends CoreVector<bigint> {
  constructor(vector: Array<bigint>) {
    super(vector)
  }

  wrap = (v: Array<bigint>) => new ScalarVector(v) as this

  addScalarVector = (other: ScalarVector) => {
    this.compareLength(other)
    return this.wrap(
      this.vector.map((_, i) => mod(this.vector[i] + other.vector[i])),
    )
  }

  mulScalar = (scalar: bigint) => {
    return this.wrap(this.vector.map((v) => mod(v * scalar)))
  }

  mulScalarVector = (other: ScalarVector) => {
    this.compareLength(other)
    return this.vector
      .map((_, i) => mod(this.vector[i] * other.vector[i]))
      .reduce((m, n) => mod(m + n))
  }

  mulPointVector = (other: PointVector) => {
    this.compareLength(other)
    return this.vector
      .map((_, i) => other.vector[i].multiply(this.vector[i]))
      .reduce((m, n) => m.add(n))
  }
}

/**
 * Point vector
 */
export class PointVector extends CoreVector<Point> {
  constructor(vector: Array<Point>) {
    super(vector)
  }

  wrap = (v: Array<Point>) => new PointVector(v) as this

  addPointVector = (other: PointVector) => {
    this.compareLength(other)
    return this.wrap(
      this.vector.map((_, i) => this.vector[i].add(other.vector[i])),
    )
  }

  mulScalar = (scalar: bigint) => {
    return this.wrap(this.vector.map((v) => v.multiply(scalar)))
  }

  mulScalarVector = (other: ScalarVector) => {
    return other.mulPointVector(this)
  }
}
