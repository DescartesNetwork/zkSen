import { Point } from 'point'
import { mod, randScalar } from 'utils'
import { noninteractive } from './fiatShamirHeuristic'

/**
 * Chaum-Pedersen Proof
 *
 * PK ( γ ) { G, H, C1 = γG, C2 = γH }
 *
 * Prover:
 * r <-$- Z
 * D1 = rG
 * D2 = rH
 * s = Hash(G, H, C1, C2, D1, D2)
 * z = r + sγ
 * Proof { z, D1, D2 }
 *
 * Verifier
 * zG ?= sC1 + D1
 * zH ?= sC2 + D2
 */

export type ChaumPedersenCommitment = {
  G: Point
  H: Point
  C1: Point
  C2: Point
}

export type ChaumPedersenProof = {
  z: bigint
  D1: Point
  D2: Point
} // 96 Bytes

export const ChaumPedersen = {
  prove: (
    commitment: ChaumPedersenCommitment,
    gamma: bigint,
  ): ChaumPedersenProof => {
    const { G, H, C1, C2 } = commitment
    if (!G.multiply(gamma).equals(C1) || !H.multiply(gamma).equals(C2))
      throw new Error('The commiment is broken')
    const r = randScalar()
    const D1 = G.multiply(r)
    const D2 = H.multiply(r)
    const s = noninteractive(G, H, C1, C2, D1, D2)
    const z = mod(r + gamma * s)
    return { z, D1, D2 }
  },
  verify: (commitment: ChaumPedersenCommitment, zkp: ChaumPedersenProof) => {
    const { G, H, C1, C2 } = commitment
    const { z, D1, D2 } = zkp
    const s = noninteractive(G, H, C1, C2, D1, D2)
    let ok = true
    ok = ok && G.multiply(z).equals(C1.multiply(s).add(D1))
    ok = ok && H.multiply(z).equals(C2.multiply(s).add(D2))
    return ok
  },
}

/**
 * Shuffle Proof
 *
 * PK ( γ ) { G, A = aG, B = bG, C = γG, C1 = γaG, C2 = γbG }
 *
 * Prover:
 * r1 = Hash(A, B, C, C1, C2, G)
 * r2 = Hash(A, B, C, C1, C2, 2G)
 * Chaum-Pedersen Proof: CPP1 = PK ( γ ) { G, A+B, C, C1+C2 }
 * Chaum-Pedersen Proof: CPP2 = PK ( γ ) { G, r1A+r2B, C, r2C1+r2C2 }
 *
 * Verifier:
 * Chaum-Pedersen Verifier { CPP1 } && Chaum-Pedersen Verifier { CPP2 }
 */

export type ShuffleCommitment = {
  A: Point
  B: Point
  C: Point
  C1: Point
  C2: Point
}

export type ShuffleProof = {
  CPP1: ChaumPedersenProof
  CPP2: ChaumPedersenProof
} // 192 Bytes

export const Shuffle = {
  prove: (commitment: ShuffleCommitment, gamma: bigint): ShuffleProof => {
    const { A, B, C, C1, C2 } = commitment
    if (
      !Point.G.multiply(gamma).equals(C) ||
      !A.multiply(gamma).equals(C1) ||
      !B.multiply(gamma).equals(C2)
    )
      throw new Error('The commiment is broken')

    const r1 = noninteractive(A, B, C, C1, C2, Point.G.multiply(1n))
    const r2 = noninteractive(A, B, C, C1, C2, Point.G.multiply(2n))

    // PK ( γ ) { G, A+B, γG, γ(A+B) }
    const commiment1: ChaumPedersenCommitment = {
      G: Point.G,
      H: A.add(B),
      C1: C,
      C2: C1.add(C2),
    }
    const CPP1 = ChaumPedersen.prove(commiment1, gamma)
    // PK ( γ ) { G, r1A+r2B, γG, γ(r1A+r2B) }
    const commiment2: ChaumPedersenCommitment = {
      G: Point.G,
      H: A.multiply(r1).add(B.multiply(r2)),
      C1: C,
      C2: C1.multiply(r1).add(C2.multiply(r2)),
    }
    const CPP2 = ChaumPedersen.prove(commiment2, gamma)

    return { CPP1, CPP2 }
  },
  verify: (commitment: ShuffleCommitment, zkp: ShuffleProof) => {
    const { A, B, C, C1, C2 } = commitment
    const { CPP1, CPP2 } = zkp

    const r1 = noninteractive(A, B, C, C1, C2, Point.G.multiply(1n))
    const r2 = noninteractive(A, B, C, C1, C2, Point.G.multiply(2n))

    const commiment1: ChaumPedersenCommitment = {
      G: Point.G,
      H: A.add(B),
      C1: C,
      C2: C1.add(C2),
    }
    const commiment2: ChaumPedersenCommitment = {
      G: Point.G,
      H: A.multiply(r1).add(B.multiply(r2)),
      C1: C,
      C2: C1.multiply(r1).add(C2.multiply(r2)),
    }

    return (
      ChaumPedersen.verify(commiment1, CPP1) &&
      ChaumPedersen.verify(commiment2, CPP2)
    )
  },
}
