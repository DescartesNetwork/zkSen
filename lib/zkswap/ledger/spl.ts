import { Keypair, PublicKey } from '@solana/web3.js'
import { randScalar } from '../../utils'
import { TwistedElGamal } from '../twistedElgamal'

export class Account {
  public publicKey: PublicKey
  public amount: TwistedElGamal
  public s: bigint

  constructor(
    publicKey: PublicKey = new Keypair().publicKey,
    amount: bigint = 0n,
    s: bigint = randScalar(),
  ) {
    this.publicKey = publicKey
    this.amount = new TwistedElGamal(amount, s)
    this.s = s
  }

  send = (amount: TwistedElGamal) => {
    this.amount.add(amount)
  }

  receive = (amount: TwistedElGamal) => {
    this.amount.subtract(amount)
  }
}

/**
 * For simplicity, we skip all the proofs and assume all the computation is honest
 */
export class Mint {
  public publicKey: PublicKey
  public supply: TwistedElGamal
  public accounts: Account[]
  public s: bigint

  constructor(
    publicKey: PublicKey = new Keypair().publicKey,
    s: bigint = randScalar(),
  ) {
    this.publicKey = publicKey
    this.s = s
    this.accounts = []
    this.supply = new TwistedElGamal(0n, this.s)
  }

  getAccount = (accountPublicKey: PublicKey) => {
    const index = this.accounts.findIndex(
      ({ publicKey }) => publicKey.toBase58() === accountPublicKey.toBase58(),
    )
    if (index === -1) throw new Error('Account is not initialized yet')
    return this.accounts[index]
  }

  initializeAccount = () => {
    this.accounts.push(new Account())
    return this.accounts[this.accounts.length - 1]
  }

  mintTo = (
    accountPublicKey: PublicKey,
    srcAmount: TwistedElGamal,
    dstAmount: TwistedElGamal,
  ) => {
    const account = this.getAccount(accountPublicKey)
    this.supply = this.supply.add(srcAmount)
    account.amount = account.amount.add(dstAmount)
  }

  transfer = (
    srcPublickey: PublicKey,
    dstPublickey: PublicKey,
    srcAmount: TwistedElGamal,
    dstAmount: TwistedElGamal,
  ) => {
    const src = this.getAccount(srcPublickey)
    const dst = this.getAccount(dstPublickey)
    src.amount = src.amount.subtract(srcAmount)
    dst.amount = dst.amount.add(dstAmount)
  }
}
