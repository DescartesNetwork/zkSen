import { expect } from 'chai'
import { randScalar } from '../lib/utils'
import { TwistedElGamal } from '../lib/zkswap/twistedElgamal'
import { Equality, ScalarMultiplication } from '../lib/zkswap/zk'

describe('zk', function () {
  it('scalar multiplication proof', () => {
    const scalar = randScalar()
    const commitment = new TwistedElGamal(randScalar(), randScalar())
    const proof = ScalarMultiplication.prove(scalar, commitment)
    const ok = ScalarMultiplication.verify(proof)
    expect(ok).true
  })

  it('equality proof', () => {
    const m = randScalar()
    const r1 = randScalar()
    const r2 = randScalar()
    const C1 = new TwistedElGamal(m, randScalar(), r1).C
    const C2 = new TwistedElGamal(m, randScalar(), r2).C
    const proof = Equality.prove(m, r1, r2, C1, C2)
    const ok = Equality.verify(C1, C2, proof)
    expect(ok).true
  })
})
