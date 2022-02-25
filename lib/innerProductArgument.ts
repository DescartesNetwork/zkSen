import { utils, Point, CURVE } from '@noble/ed25519'
import { hash } from 'tweetnacl'
import { invert, randToxic } from './utils'
import { PointVector, ScalarVector } from './vectors'

/**
 * Credit: https://dankradfeist.de/ethereum/2021/07/27/inner-product-arguments.html
 * We heavily rely on the excellent notation in this essay
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

export type ProverParams = { sk: SecretKnowledge; pk: PublicKnowledge }

export class InnerProductArgumentProver {
  private _sk: SecretKnowledge
  private _pk: PublicKnowledge

  constructor({ sk, pk }: ProverParams) {
    this._sk = sk
    this._pk = pk
  }

  singleRound = (): ProverParams => {
    let { a, b } = this._sk
    let { C, g, h, q } = this._pk

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

    const x = randToxic()
    const inverseX = invert(x) // x^-1

    a = a.left.addScalarVector(a.right.mulScalar(x))
    b = b.left.addScalarVector(b.right.mulScalar(inverseX))

    C = CL.multiply(x).add(C).add(CR.multiply(inverseX))

    g = g.left.addPointVector(g.right.mulScalar(inverseX))
    h = h.left.addPointVector(h.right.mulScalar(x))

    return { sk: { a, b }, pk: { C, g, h, q } }
  }
}
