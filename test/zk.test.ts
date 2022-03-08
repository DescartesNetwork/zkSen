import { expect } from 'chai'
import { randScalar } from '../lib/utils'
import { TwistedElGamal } from '../lib/zkswap/twistedElgamal'
import { PerdesenEquality, ScalarMultiplication } from '../lib/zk'
import { HybridEquality } from '../lib/zk/hybridEquality'

describe('zk', function () {
  it('scalar multiplication proof', () => {
    const scalar = randScalar()
    const commitment = new TwistedElGamal(randScalar(), randScalar())
    const proof = ScalarMultiplication.prove(scalar, commitment)
    const ok = ScalarMultiplication.verify(proof)
    expect(ok).true
  })

  it('perdesen equality proof', () => {
    const m = randScalar()
    const r1 = randScalar()
    const r2 = randScalar()
    const C1 = new TwistedElGamal(m, randScalar(), r1).C
    const C2 = new TwistedElGamal(m, randScalar(), r2).C
    const proof = PerdesenEquality.prove(m, r1, r2, C1, C2)
    const ok = PerdesenEquality.verify(C1, C2, proof)
    expect(ok).true
  })

  it('hybrid equality proof', () => {
    const m = randScalar()
    const s1 = randScalar()
    const r2 = randScalar()
    const C1 = new TwistedElGamal(m, s1, randScalar())
    const C2 = new TwistedElGamal(m, randScalar(), r2)
    const proof = HybridEquality.prove(s1, r2, C1, C2)
    const ok = HybridEquality.verify(C1, C2, proof)
    expect(ok).true
  })
})
