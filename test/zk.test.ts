import { expect } from 'chai'
import { mod, randScalar } from '../lib/utils'
import { TwistedElGamal } from '../lib/twistedElGamal'
import {
  Multiplication,
  PerdesenEquality,
  ScalarMultiplication,
  HybridEquality,
  SquareRoot,
} from '../lib/zk'

describe('zk', function () {
  it('scalar multiplication proof', () => {
    const scalar = randScalar()
    const commitment = new TwistedElGamal(randScalar(), randScalar())
    const proof = ScalarMultiplication.prove(scalar, commitment)
    const ok = ScalarMultiplication.verify(proof)
    expect(ok).true
  })

  it('multiplication proof', () => {
    const a = randScalar()
    const b = randScalar()
    const r1 = randScalar()
    const r2 = randScalar()
    const A = new TwistedElGamal(a, randScalar(), r1).C
    const B = new TwistedElGamal(b, randScalar(), r2).C
    const Q = new TwistedElGamal(mod(a * b), randScalar(), mod(a * r2)).C
    const proof = Multiplication.prove(A, B, Q, a, r1)
    const ok = Multiplication.verify(A, B, Q, proof)
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

  it('square root', () => {
    const a = 10n
    const b = 100000n
    const c = 1000n
    const r1 = randScalar()
    const r2 = randScalar()
    const r3 = randScalar()
    const A = new TwistedElGamal(a, randScalar(), r1)
    const B = new TwistedElGamal(b, randScalar(), r2)
    const C = new TwistedElGamal(c, randScalar(), r3)
    const Q1 = new TwistedElGamal(mod(a * b), randScalar(), mod(a * r2))
    const Q2 = new TwistedElGamal(mod(c * c), randScalar(), mod(c * r3))
    const proof = SquareRoot.prove(A, B, C, Q1, Q2, a, r1, b, r2, c, r3)
    const ok = SquareRoot.verify(A, B, C, Q1, Q2, proof)
    expect(ok).true
  })
})
