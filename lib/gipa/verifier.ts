import {
  Commitment,
  Machine,
  PublicKnowledge,
  ZeroKnowledge,
} from './generator'
import { invert, mod } from '../utils'

export class Verifier extends Machine {
  constructor(pk: PublicKnowledge) {
    super(pk)
  }

  witness = (c: Commitment, zk: ZeroKnowledge) => {
    const { C } = c
    const { chain } = zk

    let C_ = C
    let xs: bigint[] = []
    chain.forEach(({ CL, CR }) => {
      const x = this.challenge(CL, CR)
      xs.push(x)
      const inverseX = invert(x)
      // C_ = x*CL + C + x^-1*CR
      C_ = CL.multiply(x).add(C_).add(CR.multiply(inverseX))
    })

    return { C_, xs }
  }

  fg = (xs: bigint[]) => {
    const { g, alpha } = this._pk
    let co = BigInt(1)
    let reversedAlpha = [...alpha].reverse()
    for (let i = 0; i < xs.length; i++) {
      const u = 1n + invert(xs[i]) * reversedAlpha[i]
      co = mod(co * u)
    }
    const g_ = g.value[0].multiply(co)
    return g_
  }

  fh = (xs: bigint[]) => {
    const { h, beta } = this._pk
    let co = BigInt(1)
    let reversedBeta = [...beta].reverse()
    for (let i = 0; i < xs.length; i++) {
      const v = 1n + xs[i] * reversedBeta[i]
      co = mod(co * v)
    }
    const h_ = h.value[0].multiply(co)
    return h_
  }

  verify = (c: Commitment, zk: ZeroKnowledge): boolean => {
    const { q } = c
    const { a, b } = zk
    const { C_, xs } = this.witness(c, zk)

    const g_ = this.fg(xs)
    const h_ = this.fh(xs)
    const D = g_
      .multiply(a.naked)
      .add(h_.multiply(b.naked))
      .add(q.multiply(mod(a.naked * b.naked)))

    return D.equals(C_)
  }
}
