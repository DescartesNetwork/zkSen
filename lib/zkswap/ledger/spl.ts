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

  findAccount = (accountPublicKey: PublicKey) => {
    const index = this.accounts.findIndex(
      ({ publicKey }) => publicKey.toBase58() === accountPublicKey.toBase58(),
    )
    if (index === -1) return undefined
    return this.accounts[index]
  }

  initializeAccount = () => {
    this.accounts.push(new Account())
    return this.accounts[this.accounts.length - 1]
  }

  mintTo = (accountPublicKey: PublicKey, amount: bigint) => {
    const account = this.findAccount(accountPublicKey)
    if (!account) throw new Error('The account does not exist')
    this.supply = this.supply.add(new TwistedElGamal(amount, this.s))
    account.amount = account.amount.add(new TwistedElGamal(amount, account.s))
  }

  transfer = (
    senderPublickey: PublicKey,
    receiverPublickey: PublicKey,
    amount: bigint,
  ) => {
    const sender = this.findAccount(senderPublickey)
    const receiver = this.findAccount(receiverPublickey)
    if (!sender) throw new Error('The sender does not exist')
    if (!receiver) throw new Error('The receiver does not exist')
    sender.amount = sender.amount.subtract(new TwistedElGamal(amount, sender.s))
    receiver.amount = receiver.amount.add(
      new TwistedElGamal(amount, receiver.s),
    )
  }
}
