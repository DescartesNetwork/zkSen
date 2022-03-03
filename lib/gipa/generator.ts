import { Point } from '../point'
import { randPoint, randScalar, mod } from '../utils'
import { PointVector, ScalarVector } from '../vectors'
import { hash } from 'tweetnacl'

/**
 * Generalized Inner Product Argument (GIPA)
 * Credit:
 * 1. https://eprint.iacr.org/2019/1177.pdf
 * 2. https://dankradfeist.de/ethereum/2021/07/27/inner-product-arguments.html#fn:2
 * (We heavily rely on the excellent notation in these essays)
 *
 * C = a*g + b*h + (a*b)*q
 * a & b are vectors of scalars
 * g & h are vectors of generators (points)
 * q is a generator (point) then a*b*q is a point too
 */

export type CommitmentKey = {
  a: ScalarVector
  b: ScalarVector
}

export type Commitment = {
  q: Point
  C: Point
}

export type PublicKnowledge = {
  g: PointVector
  h: PointVector
  alpha: bigint[]
  beta: bigint[]
}

export type ZeroKnowledge = {
  a: ScalarVector
  b: ScalarVector
  chain: Array<{
    CL: Point
    CR: Point
  }>
}

/**
 * Generate a bigint range
 * @param length
 * @returns
 */
export const range = (length: number) => {
  return [...Array(length).keys()].map((i) => BigInt(i))
}

export class Machine {
  protected _pk: PublicKnowledge
  protected _l: number

  constructor(pk: PublicKnowledge) {
    this._pk = pk
    const { g, h } = this._pk
    this._l = Math.log2(g.length)
    if (this._l % 2 !== 0 || g.length !== h.length)
      throw new Error('All vector lengths must be an power by 2')
  }

  /**
   * Set up
   * @param length - the bit length of the range proof
   * @returns
   */
  static generate = (length: number = 64): PublicKnowledge => {
    const l = Math.log2(length)
    if (l % 2 !== 0) throw new Error('The length must be an power by 2')
    const r = range(length)
    // alpha: [α^2, α^4, α^8, α^16, α^32, α^64, ...]
    const _alpha = randScalar()
    const alpha: bigint[] = range(l).map((i) => mod(_alpha ** (2n ** (i + 1n))))
    // g: [G, G*α^2, G*α^4, G*α^6, ...]
    const G = randPoint()
    const g = new PointVector(r.map((i) => G.multiply(mod(_alpha ** (2n * i)))))
    // beta: [β^2, β^4, β^8, β^16, β^32, β^64, ...]
    const _beta = randScalar()
    const beta: bigint[] = range(l).map((i) => mod(_beta ** (2n ** (i + 1n))))
    // h: [H, H*β^2, H*β^4, H*β^6, ...]
    const H = randPoint()
    const h = new PointVector(r.map((i) => H.multiply(mod(_beta ** (2n * i)))))
    return { g, h, alpha, beta }
  }

  /**
   * Fiat-Shamir heuristic
   * @param CL Point
   * @param CR Point
   */
  protected challenge = (CL: Point, CR: Point) => {
    const buf = hash(new Uint8Array([...CL.toRawBytes(), ...CR.toRawBytes()]))
    const x = randScalar(buf)
    return x
  }
}
