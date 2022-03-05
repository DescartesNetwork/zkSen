import { PublicKey } from '@solana/web3.js'
import { Mint } from './spl'

/**
 * Virtual ledger
 */
export class Ledger {
  public mints: Mint[]

  constructor() {
    this.mints = []
  }

  findMint = (mintPublickey: PublicKey) => {
    const index = this.mints.findIndex(
      (mint) => mint.publicKey.toBase58() === mintPublickey.toBase58(),
    )
    if (index === -1) return undefined
    return this.mints[index]
  }

  initializeMint = () => {
    const mint = new Mint()
    this.mints.push(mint)
    return mint.publicKey
  }

  initializeAccount = (mintPublicKey: PublicKey) => {
    const mint = this.findMint(mintPublicKey)
    if (!mint) throw new Error('The mint does not exist')
    return mint.initializeAccount().publicKey
  }

  mintTo = (
    dstPublickey: PublicKey,
    amount: bigint,
    mintPublicKey: PublicKey,
  ) => {
    const mint = this.findMint(mintPublicKey)
    if (!mint) throw new Error('The mint does not exist')
    mint.mintTo(dstPublickey, amount)
  }

  transfer = (
    srcPublickey: PublicKey,
    dstPublickey: PublicKey,
    amount: bigint,
    mintPublicKey: PublicKey,
  ) => {
    const mint = this.findMint(mintPublicKey)
    if (!mint) throw new Error('The mint does not exist')
    mint.transfer(srcPublickey, dstPublickey, amount)
  }
}
