import { hash } from 'tweetnacl'
import { Point } from './point'
import { invert, randScalar } from './utils'
import { PointVector, ScalarVector } from './vectors'

/**
 * Credit:
 * 1. https://dankradfeist.de/ethereum/2021/07/27/inner-product-arguments.html
 * 2. https://www.cryptologie.net/article/528/what-is-an-inner-product-argument-part-1/
 * 3. https://eprint.iacr.org/2017/1066.pdf
 *
 * (We heavily rely on the excellent notation in the first essay,
 *  but the Improved Inner-Product Argument in the second and third for fundemental.)
 *
 * C = a*g + b*h + (a*b)*q
 * a & b are vectors of scalars
 * g & h are vectors of generators (points)
 * q is a generator (point) then a*b*q is a point too
 */
export type SecretKnowledge = {
  a: ScalarVector
  b: ScalarVector
}
export type PublicKnowledge = {
  g: PointVector
  h: PointVector
  q: Point
  C: Point
}
export type Challenges = bigint[]

export type ProverParams = {
  sk: SecretKnowledge
  pk: PublicKnowledge
  xs: Challenges
}
export type VerifierParams = { sk: SecretKnowledge; xs: Challenges }

/**
 * Fiat-Shamir heuristic
 * @param CL Point
 * @param CR Point
 */
export const challenge = (CL: Point, CR: Point) => {
  const buf = hash(new Uint8Array([...CL.toRawBytes(), ...CR.toRawBytes()]))
  const x = randScalar(buf)
  return x
}

export class InnerProductArgumentProver {
  private _sk: SecretKnowledge
  private _pk: PublicKnowledge

  constructor({ sk, pk }: { sk: SecretKnowledge; pk: PublicKnowledge }) {
    this._sk = sk
    this._pk = pk
  }

  round = ({ sk, pk, xs }: ProverParams): ProverParams => {
    const { a, b } = sk
    const { C, g, h, q } = pk

    const zL = a.right.mulScalarVector(b.left)
    const zR = a.left.mulScalarVector(b.right)

    const CL = a.right
      .mulPointVector(g.left)
      .add(b.left.mulPointVector(h.right))
      .add(q.multiply(zL))
    const CR = a.left
      .mulPointVector(g.right)
      .add(b.right.mulPointVector(h.left))
      .add(q.multiply(zR))

    const x = challenge(CL, CR)
    const inverseX = invert(x) // x^-1

    const a_ = a.left.addScalarVector(a.right.mulScalar(x))
    const b_ = b.left.addScalarVector(b.right.mulScalar(inverseX))

    const C_ = CL.multiply(x).add(C).add(CR.multiply(inverseX))

    const g_ = g.left.addPointVector(g.right.mulScalar(inverseX))
    const h_ = h.left.addPointVector(h.right.mulScalar(x))

    const xs_ = [...xs, x]

    return {
      sk: { a: a_, b: b_ },
      pk: { C: C_, g: g_, h: h_, q },
      xs: xs_,
    }
  }

  prove = (): ProverParams => {
    let params: ProverParams = { sk: this._sk, pk: this._pk, xs: [] }
    while (params.sk.a.vector.length > 1) params = this.round(params)
    return params
  }
}

export class InnerProductArgumentVerifier {
  private _pk: PublicKnowledge

  constructor({ pk }: { pk: PublicKnowledge }) {
    this._pk = pk
  }

  verify = ({ sk, xs }: VerifierParams) => {
    const { a, b } = sk
    const { C, g, h, q } = this._pk

    const D = a
      .mulPointVector(g)
      .add(b.mulPointVector(h))
      .add(q.multiply(a.mulScalarVector(b)))

    return D.equals(C)
  }
}
