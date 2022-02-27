import {
  Commitment,
  CommitmentKey,
  Machine,
  PublicKnowledge,
  ZeroKnowledge,
} from './generator'
import { invert, randPoint } from '../utils'
import { Point } from '../point'

export type RoundInput = {
  c: Commitment
  ck: CommitmentKey
  pk: PublicKnowledge
}

export type RoundOutput = {
  c: Commitment
  ck: CommitmentKey
  pk: PublicKnowledge
  zk: { CL: Point; CR: Point }
}

export class Prover extends Machine {
  constructor(pk: PublicKnowledge) {
    super(pk)
  }

  private round = ({ c, ck, pk }: RoundInput): RoundOutput => {
    const { C, q } = c
    const { a, b } = ck
    const { g, h, alpha, beta } = pk

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

    const x = this.challenge(CL, CR)
    const inverseX = invert(x) // x^-1

    const a_ = a.left.addScalarVector(a.right.mulScalar(x))
    const b_ = b.left.addScalarVector(b.right.mulScalar(inverseX))

    const g_ = g.left.addPointVector(g.right.mulScalar(inverseX))
    const h_ = h.left.addPointVector(h.right.mulScalar(x))

    const C_ = CL.multiply(x).add(C).add(CR.multiply(inverseX))

    return {
      c: { C: C_, q },
      ck: { a: a_, b: b_ },
      pk: { g: g_, h: h_, alpha, beta },
      zk: { CL, CR },
    }
  }

  commit = (ck: CommitmentKey): Commitment => {
    const q = randPoint()
    const C = this._pk.g
      .mulScalarVector(ck.a)
      .add(this._pk.h.mulScalarVector(ck.b))
      .add(q.multiply(ck.a.mulScalarVector(ck.b)))
    return { C, q }
  }

  prove = (c: Commitment, ck: CommitmentKey): ZeroKnowledge => {
    let chain: ZeroKnowledge['chain'] = []
    let params: RoundInput = { c, ck, pk: this._pk }
    while (params.ck.a.length > 1) {
      const { c, ck, pk, zk } = this.round(params)
      params = { c, ck, pk }
      chain.push(zk)
    }
    return { ...params.ck, chain }
  }
}
