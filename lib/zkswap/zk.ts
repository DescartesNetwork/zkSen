import { Point } from '../point'
import { invert, mod, randScalar } from '../utils'
import { TwistedElGamal } from './twistedElGamal'
import { hash } from 'tweetnacl'
import { AMM } from './amm'
import { Account } from './ledger/spl'

/**
 * Fiat-Shamir heuristic
 * @param agrs
 * @returns
 */
const noninteractive = (...agrs: Point[]) => {
  const seed = agrs.reduce(
    (prev, cur) => new Uint8Array([...prev, ...cur.toRawBytes()]),
    new Uint8Array([]),
  )
  const c = randScalar(hash(seed))
  return c
}

/**
 * Scalar Multiplication Proof
 */

export type ScalarMultiplicationProof = {
  scalar: bigint
  commitment: TwistedElGamal
  multipliedCommitment: TwistedElGamal
}

export const ScalarMultiplication = {
  prove: (
    scalar: bigint,
    commitment: TwistedElGamal,
  ): ScalarMultiplicationProof => {
    return {
      scalar,
      commitment,
      multipliedCommitment: commitment.multiply(scalar),
    }
  },

  verify: (proof: ScalarMultiplicationProof) => {
    const { scalar, commitment, multipliedCommitment } = proof
    return commitment.multiply(scalar).identify(multipliedCommitment)
  },
}

/**
 * Equality Proof
 *
 * Public Commitments:
 * C1 = mG + r1H
 * C2 = mg + r2H
 *
 * Prover:
 * r3, r4, r5 <-$- Zp
 * C3 = r3G + r4H
 * C4 = r3G + r5H
 * c = Hash(C1, C2, C3, C4)
 * z1 = cm + r3
 * z2 = cr1 + r4
 * z3 = cr2 + r5
 * Proof { C1, C2, C3, C4, z1, z2, z3 }
 *
 * Verifier:
 * C3 + cC1 ?= z1G + z2H
 * C4 + cC2 ?= z1G + z3H
 */

export type EqualityProof = {
  C3: Point
  C4: Point
  z1: bigint
  z2: bigint
  z3: bigint
}

export const Equality = {
  prove: (
    m: bigint,
    r1: bigint,
    r2: bigint,
    C1: Point,
    C2: Point,
  ): EqualityProof => {
    const r3 = randScalar()
    const r4 = randScalar()
    const r5 = randScalar()

    const C3 = Point.G.multiply(r3).add(Point.H.multiply(r4))
    const C4 = Point.G.multiply(r3).add(Point.H.multiply(r5))

    const c = noninteractive(C1, C2, C3, C4)
    const z1 = mod(c * m + r3)
    const z2 = mod(c * r1 + r4)
    const z3 = mod(c * r2 + r5)

    return { C3, C4, z1, z2, z3 }
  },

  verify: (C1: Point, C2: Point, proof: EqualityProof) => {
    const { C3, C4, z1, z2, z3 } = proof
    const c = noninteractive(C1, C2, C3, C4)
    const L1 = C3.add(C1.multiply(c))
    const R1 = Point.G.multiply(z1).add(Point.H.multiply(z2))
    const L2 = C4.add(C2.multiply(c))
    const R2 = Point.G.multiply(z1).add(Point.H.multiply(z3))
    return L1.equals(R1) && L2.equals(R2)
  },
}

/**
 * Swap Proof
 *
 * Public Commitments:
 *
 * Prover:
 * srcAmount A
 */
export type SwapProof = {
  gamma: bigint
  srcBidAmount: TwistedElGamal
  dstAskAmount: TwistedElGamal
  bidAdjustment: TwistedElGamal
  askAdjustment: TwistedElGamal
  equalityBidProof: EqualityProof
  equalityAskProof: EqualityProof
}

export const Swap = {
  prove: (
    gamma: bigint,
    rbid: bigint,
    rask: bigint,
    src: TwistedElGamal,
    dst: TwistedElGamal,
    bidTreasury: Account,
    askTreasury: Account,
  ): SwapProof => {
    if (gamma >= AMM.PRECISION) throw new Error('Invalid gamma')

    console.log(
      rbid,
      Point.G.multiply(rbid).toHex(),
      bidTreasury.amount.C.subtract(
        bidTreasury.amount.P.multiply(bidTreasury.s),
      ).toHex(),
    )

    // console.log(
    //   bidTreasury.amount.C.subtract(Point.G.multiply(rbid)).toHex(),
    //   Point.H.multiply(bidTreasury.z).toHex(),
    // )

    // Generate bid-side amount for user and proof of equality
    const bidAdjustmentAmount =
      rbid * AMM.PRECISION - ((rbid * AMM.PRECISION) / gamma) * gamma
    const bidAmount =
      (rbid * AMM.PRECISION - bidAdjustmentAmount) / gamma - rbid
    const z1 = randScalar()
    const bidAdjustment = new TwistedElGamal(
      bidAdjustmentAmount,
      bidTreasury.s,
      z1,
    )
    const z2 = randScalar()
    const srcBidAmount = TwistedElGamal.build(
      Point.G.multiply(bidAmount).add(Point.H.multiply(z2)),
      src.P.multiply(z2),
      src.P,
    )
    const dstBidAmount = bidTreasury.amount
      .multiply(AMM.PRECISION)
      .subtract(bidAdjustment)
      .multiply(invert(gamma))
      .subtract(bidTreasury.amount)
    const zbid = mod(
      (bidTreasury.z * AMM.PRECISION - z1) * invert(gamma) - bidTreasury.z,
    )
    const equalityBidProof = Equality.prove(
      bidAmount,
      z2,
      zbid,
      srcBidAmount.C,
      dstBidAmount.C,
    )
    console.log(
      dstBidAmount.C.subtract(Point.H.multiply(zbid)).toHex(),
      Point.G.multiply(bidAmount).toHex(),
      srcBidAmount.C.subtract(Point.H.multiply(z2)).toHex(),
      dstBidAmount.C.subtract(dstBidAmount.D.multiply(bidTreasury.s)).toHex(),
      Equality.verify(srcBidAmount.C, dstBidAmount.C, equalityBidProof),
    )
    // Generate ask-side amount for user and proof of equality
    const askAdjustmentAmount =
      rask * gamma - ((rask * gamma) / AMM.PRECISION) * AMM.PRECISION
    const askAmount =
      rask - (rask * gamma - askAdjustmentAmount) / AMM.PRECISION
    const z3 = randScalar()
    const askAdjustment = new TwistedElGamal(
      askAdjustmentAmount,
      askTreasury.s,
      z3,
    )
    const srcAskAmount = askTreasury.amount.subtract(
      askTreasury.amount
        .multiply(gamma)
        .subtract(askAdjustment)
        .multiply(invert(AMM.PRECISION)),
    )
    const z4 = randScalar()
    const dstAskAmount = TwistedElGamal.build(
      Point.G.multiply(askAmount).add(Point.H.multiply(z4)),
      dst.P.multiply(z4),
      dst.P,
    )
    const equalityAskProof = Equality.prove(
      askAmount,
      (askTreasury.z * gamma - z2) / AMM.PRECISION,
      z4,
      srcAskAmount.C,
      dstAskAmount.C,
    )
    // Return proof
    return {
      gamma,
      srcBidAmount,
      dstAskAmount,
      bidAdjustment,
      askAdjustment,
      equalityBidProof,
      equalityAskProof,
    }
  },

  verify: (
    bidTreasuryAmount: TwistedElGamal,
    askTreasuryAmount: TwistedElGamal,
    proof: SwapProof,
  ) => {
    const {
      gamma,
      srcBidAmount,
      dstAskAmount,
      bidAdjustment,
      askAdjustment,
      equalityBidProof,
      equalityAskProof,
    } = proof
    let ok = true
    console.log(0, ok)
    // Check equality of bid side
    const dstBidAmount = bidTreasuryAmount
      .multiply(AMM.PRECISION)
      .subtract(bidAdjustment)
      .multiply(invert(gamma))
      .subtract(bidTreasuryAmount)
    ok = ok && Equality.verify(srcBidAmount.C, dstBidAmount.C, equalityBidProof)
    console.log(1, ok)
    // Check equality of ask side
    const srcAskAmount = askTreasuryAmount.subtract(
      askTreasuryAmount
        .multiply(gamma)
        .subtract(askAdjustment)
        .multiply(invert(AMM.PRECISION)),
    )
    ok = ok && Equality.verify(srcAskAmount.C, dstAskAmount.C, equalityAskProof)
    console.log(2, ok)
    // Return
    return ok
  },
}
