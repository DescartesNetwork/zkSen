import { expect } from 'chai'
import { TwistedElGamal } from '../lib/twistedElGamal'
import { mod, randScalar } from '../lib/utils'

const m = randScalar()
const s = randScalar()

describe('twisted elgamal', function () {
  const twistedElGamal = new TwistedElGamal(m, s)

  it('add', () => {
    const doubledTwistedElGamal = twistedElGamal.add(twistedElGamal)
    const ok = doubledTwistedElGamal.verify(mod(2n * m), s)
    expect(ok).true
  })

  it('sub', () => {
    const tripledTwistedElGamal = twistedElGamal
      .add(twistedElGamal)
      .add(twistedElGamal)
    const doubledTwistedElGamal = tripledTwistedElGamal.subtract(twistedElGamal)
    const ok = doubledTwistedElGamal.verify(mod(2n * m), s)
    expect(ok).true
  })

  it('mul', () => {
    const doubledTwistedElGamal = twistedElGamal.multiply(2n)
    const ok = doubledTwistedElGamal.verify(mod(2n * m), s)
    expect(ok).true
  })

  it('verify', () => {
    const ok = twistedElGamal.verify(m, s)
    expect(ok).true
  })
})
