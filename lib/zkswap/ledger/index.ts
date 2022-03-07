import { PublicKey } from '@solana/web3.js'
import { Mint } from './spl'
import { RPC } from '../rpc'
import { TwistedElGamal } from '../twistedElGamal'

export const LedgerPing = 'ledger/ping'

export enum LedgerActions {
  GetMint = 'ledger/action/getMint',
  GetAccount = 'ledger/action/getAccount',
  InitializeMint = 'ledger/action/initializeMint',
  InitializeAccount = 'ledger/action/initializeAccount',
  MintTo = 'ledger/action/mintTo',
  Burn = 'ledger/action/burn',
  Transfer = 'ledger/action/transfer',
}

export enum LedgerEvents {
  GetMint = 'ledger/event/getMint',
  GetAccount = 'ledger/event/getAccount',
  InitializeMint = 'ledger/event/initializeMint',
  InitializeAccount = 'ledger/event/initializeAccount',
  MintTo = 'ledger/event/mintTo',
  Burn = 'ledger/event/burn',
  Transfer = 'ledger/event/transfer',
}

/**
 * Virtual ledger
 */
export class Ledger {
  public mints: Mint[]
  private rpc: RPC

  constructor(rpc: RPC) {
    this.mints = []
    this.rpc = rpc
  }

  start = () => {
    this.rpc.on(LedgerPing, () => true)
    this.rpc.on(LedgerActions.GetMint, (mintPublickey: PublicKey) => {
      return this.getMint(mintPublickey)
    })
    this.rpc.on(LedgerActions.GetAccount, (accountPublicKey: PublicKey) => {
      return this.getAccount(accountPublicKey)
    })
    this.rpc.on(LedgerActions.InitializeMint, () => {
      return this.initializeMint()
    })
    this.rpc.on(LedgerActions.InitializeAccount, (mintPublicKey: PublicKey) => {
      return this.initializeAccount(mintPublicKey)
    })
    this.rpc.on(
      LedgerActions.MintTo,
      (
        srcAmount: TwistedElGamal,
        dstAmount: TwistedElGamal,
        dstPublickey: PublicKey,
        mintPublicKey: PublicKey,
      ) => {
        return this.mintTo(srcAmount, dstAmount, dstPublickey, mintPublicKey)
      },
    )
    this.rpc.on(
      LedgerActions.Burn,
      (
        srcAmount: TwistedElGamal,
        dstAmount: TwistedElGamal,
        srcPublickey: PublicKey,
        mintPublicKey: PublicKey,
      ) => {
        return this.burn(srcAmount, dstAmount, srcPublickey, mintPublicKey)
      },
    )
    this.rpc.on(
      LedgerActions.Transfer,
      (
        srcAmount: TwistedElGamal,
        dstAmount: TwistedElGamal,
        srcPublickey: PublicKey,
        dstPublickey: PublicKey,
        mintPublicKey: PublicKey,
      ) => {
        return this.transfer(
          srcAmount,
          dstAmount,
          srcPublickey,
          dstPublickey,
          mintPublicKey,
        )
      },
    )
  }

  getMint = (mintPublickey: PublicKey) => {
    const index = this.mints.findIndex(
      (mint) => mint.publicKey.toBase58() === mintPublickey.toBase58(),
    )
    if (index === -1) throw new Error('The mint is not initialized yet')
    return this.mints[index]
  }

  getAccount = (accountPublickey: PublicKey) => {
    for (let mint of this.mints) {
      try {
        const account = mint.getAccount(accountPublickey)
        if (account) return account
      } catch (er) {
        // Nothing
      }
    }
    throw new Error('The mint is not initialized yet')
  }

  initializeMint = () => {
    const mint = new Mint()
    this.mints.push(mint)
    this.rpc.emit(LedgerEvents.InitializeMint, mint.publicKey)
    return mint.publicKey
  }

  initializeAccount = (mintPublicKey: PublicKey) => {
    const mint = this.getMint(mintPublicKey)
    const account = mint.initializeAccount()
    this.rpc.emit(LedgerEvents.InitializeAccount, account.publicKey)
    return account.publicKey
  }

  mintTo = (
    srcAmount: TwistedElGamal,
    dstAmount: TwistedElGamal,
    dstPublickey: PublicKey,
    mintPublicKey: PublicKey,
  ) => {
    const mint = this.getMint(mintPublicKey)
    mint.mintTo(dstPublickey, srcAmount, dstAmount)
    this.rpc.emit(
      LedgerEvents.MintTo,
      srcAmount,
      dstAmount,
      dstPublickey,
      mintPublicKey,
    )
  }

  burn = (
    srcAmount: TwistedElGamal,
    dstAmount: TwistedElGamal,
    srcPublickey: PublicKey,
    mintPublicKey: PublicKey,
  ) => {
    const mint = this.getMint(mintPublicKey)
    mint.burn(srcPublickey, srcAmount, dstAmount)
    this.rpc.emit(
      LedgerEvents.Burn,
      srcAmount,
      dstAmount,
      srcPublickey,
      mintPublicKey,
    )
  }

  transfer = (
    srcAmount: TwistedElGamal,
    dstAmount: TwistedElGamal,
    srcPublickey: PublicKey,
    dstPublickey: PublicKey,
    mintPublicKey: PublicKey,
  ) => {
    const mint = this.getMint(mintPublicKey)
    mint.transfer(srcPublickey, dstPublickey, srcAmount, dstAmount)
    this.rpc.emit(
      LedgerEvents.Transfer,
      srcAmount,
      dstAmount,
      srcPublickey,
      dstPublickey,
      mintPublicKey,
    )
  }
}
