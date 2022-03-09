import { Keypair, PublicKey } from '@solana/web3.js'
import { randScalar } from 'utils'
import { TwistedElGamal } from 'twistedElGamal'

export class Account {
  public publicKey: PublicKey
  public amount: TwistedElGamal
  public s: bigint
  public z: bigint

  constructor(
    publicKey: PublicKey = new Keypair().publicKey,
    amount: bigint = 0n,
    s: bigint = randScalar(),
    z: bigint = randScalar(),
  ) {
    this.publicKey = publicKey
    this.s = s
    this.z = z
    this.amount = this.compute(amount)
  }

  compute = (amount: bigint) => {
    return new TwistedElGamal(amount, this.s, this.z)
  }

  send = (amount: TwistedElGamal, z: bigint = 0n) => {
    this.amount.add(amount)
    this.z += z
  }

  receive = (amount: TwistedElGamal, z: bigint = 0n) => {
    this.amount.subtract(amount)
    this.z += z
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
  public z: bigint

  constructor(
    publicKey: PublicKey = new Keypair().publicKey,
    s: bigint = randScalar(),
    z: bigint = randScalar(),
  ) {
    this.publicKey = publicKey
    this.s = s
    this.z = z
    this.accounts = []
    this.supply = this.compute(0n)
  }

  compute = (amount: bigint) => {
    return new TwistedElGamal(amount, this.s, this.z)
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

  burn = (
    accountPublicKey: PublicKey,
    srcAmount: TwistedElGamal,
    dstAmount: TwistedElGamal,
  ) => {
    const account = this.getAccount(accountPublicKey)
    account.amount = account.amount.subtract(srcAmount)
    this.supply = this.supply.subtract(dstAmount)
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
