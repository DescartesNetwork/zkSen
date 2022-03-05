import { randScalar } from '../utils'
import { TwistedElGamal } from './twistedElgamal'

export class AMM {
  public ra: TwistedElGamal
  public rb: TwistedElGamal

  constructor(ra: bigint, rb: bigint, s: bigint = randScalar()) {
    this.ra = new TwistedElGamal(ra, s)
    this.rb = new TwistedElGamal(rb, s)
  }

  verify = (
    alpha: bigint,
    amountA: TwistedElGamal,
    amountB: TwistedElGamal,
  ) => {
    return true
  }

  swapAB = (
    alpha: bigint,
    amountA: TwistedElGamal,
    amountB: TwistedElGamal,
  ) => {
    this.verify(alpha, amountA, amountB)
    this.ra.add(amountA)
    this.rb.subtract(amountB)
  }

  swapBA = (
    alpha: bigint,
    amountA: TwistedElGamal,
    amountB: TwistedElGamal,
  ) => {
    this.verify(alpha, amountA, amountB)
    this.ra.subtract(amountA)
    this.rb.add(amountB)
  }
}
