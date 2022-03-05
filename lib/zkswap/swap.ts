import { PublicKey } from '@solana/web3.js'
import { LedgerActions, LedgerPing } from './ledger'
import { Account } from './ledger/spl'
import { RPC } from './rpc'
import { TwistedElGamal } from './twistedElgamal'

export class Swap {
  private rpc: RPC
  readonly mintAPublicKey: PublicKey
  readonly mintBPublicKey: PublicKey
  readonly treasuryAPublicKey: PublicKey
  readonly treasuryBPublicKey: PublicKey

  constructor(rpc: RPC, mintAPublicKey: PublicKey, mintBPublicKey: PublicKey) {
    this.rpc = rpc
    if (!this.rpc.emit(LedgerPing)) throw 'The ledger need to run beforehand'
    this.mintAPublicKey = mintAPublicKey
    this.mintBPublicKey = mintBPublicKey
    this.treasuryAPublicKey = this.rpc.emit<PublicKey>(
      LedgerActions.InitializeAccount,
      this.mintAPublicKey,
    )
    this.treasuryBPublicKey = this.rpc.emit<PublicKey>(
      LedgerActions.InitializeAccount,
      this.mintBPublicKey,
    )
  }

  static PRECISION = 10n ** 9n

  getTreasuries = () => {
    const treasuryA = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      this.treasuryAPublicKey,
    )
    const treasuryB = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      this.treasuryBPublicKey,
    )
    return { treasuryA, treasuryB }
  }

  verify = (
    alpha: bigint, // with 10^9 precision
    amountA: TwistedElGamal,
    amountB: TwistedElGamal,
  ) => {
    const { treasuryA, treasuryB } = this.getTreasuries()
    let ok = true
    const _amountA = treasuryA.amount.multiply(alpha).divide(Swap.PRECISION)
    const _amountB = treasuryB.amount.multiply(alpha).divide(Swap.PRECISION)
    ok = ok && amountA.identical(_amountA) && amountB.identical(_amountB)
  }

  deposit = (
    srcAPublicKey: PublicKey,
    srcBPublicKey: PublicKey,
    srcAmountA: TwistedElGamal,
    dstAmountA: TwistedElGamal,
    srcAmountB: TwistedElGamal,
    dstAmountB: TwistedElGamal,
  ) => {
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountA,
      dstAmountA,
      srcAPublicKey,
      this.treasuryAPublicKey,
      this.mintAPublicKey,
    )
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountB,
      dstAmountB,
      srcBPublicKey,
      this.treasuryBPublicKey,
      this.mintBPublicKey,
    )
  }

  swapAB = (
    alpha: bigint,
    srcPublicKey: PublicKey,
    dstPublicKey: PublicKey,
    srcAmountA: TwistedElGamal,
    dstAmountA: TwistedElGamal,
    srcAmountB: TwistedElGamal,
    dstAmountB: TwistedElGamal,
  ) => {
    this.verify(alpha, dstAmountA, srcAmountB)
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountA,
      dstAmountA,
      srcPublicKey,
      this.treasuryAPublicKey,
      this.mintAPublicKey,
    )
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountB,
      dstAmountB,
      this.treasuryBPublicKey,
      dstPublicKey,
      this.mintBPublicKey,
    )
  }

  swapBA = (
    alpha: bigint,
    srcPublicKey: PublicKey,
    dstPublicKey: PublicKey,
    srcAmountB: TwistedElGamal,
    dstAmountB: TwistedElGamal,
    srcAmountA: TwistedElGamal,
    dstAmountA: TwistedElGamal,
  ) => {
    this.verify(alpha, dstAmountA, srcAmountB)
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountB,
      dstAmountB,
      srcPublicKey,
      this.treasuryBPublicKey,
      this.mintBPublicKey,
    )
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountA,
      dstAmountA,
      this.treasuryAPublicKey,
      dstPublicKey,
      this.mintAPublicKey,
    )
  }
}
