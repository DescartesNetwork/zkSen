import { PublicKey } from '@solana/web3.js'
import { invert, mod } from 'utils'
import { TwistedElGamal } from 'twistedElGamal'
import { LedgerActions, LedgerPing } from './ledger'
import { Account } from './ledger/spl'
import { RPC } from './rpc'
import {
  Deposit,
  DepositProof,
  PerdesenEquality,
  PerdesenEqualityProof,
  ScalarMultiplication,
  HybridEquality,
  HybridEqualityProof,
} from 'zk'

export enum AMMEvents {
  Init = 'amm/event/init',
  Deposit = 'amm/event/deposit',
  Withdraw = 'amm/event/withdraw',
  SwapAB = 'amm/event/swapAB',
  SwapBA = 'amm/event/swapBA',
}

export class AMM {
  private rpc: RPC
  readonly mintAPublicKey: PublicKey
  readonly mintBPublicKey: PublicKey
  readonly mintLPPublicKey: PublicKey
  readonly treasuryAPublicKey: PublicKey
  readonly treasuryBPublicKey: PublicKey

  constructor(
    rpc: RPC,
    mintAPublicKey: PublicKey,
    mintBPublicKey: PublicKey,
    mintLPPublicKey: PublicKey,
  ) {
    this.rpc = rpc
    if (!this.rpc.emit(LedgerPing)) throw 'The ledger need to run beforehand'
    this.mintAPublicKey = mintAPublicKey
    this.mintBPublicKey = mintBPublicKey
    this.mintLPPublicKey = mintLPPublicKey
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

  verifyScalarMultiplication = (
    gamma: bigint, // with 10^9 precision
    amountA: TwistedElGamal,
    amountB: TwistedElGamal,
  ) => {
    const { treasuryA, treasuryB } = this.getTreasuries()
    let scalar = mod(gamma * invert(AMM.PRECISION))
    return (
      ScalarMultiplication.verify({
        scalar,
        commitment: treasuryA.amount,
        multipliedCommitment: amountA,
      }) &&
      ScalarMultiplication.verify({
        scalar,
        commitment: treasuryB.amount,
        multipliedCommitment: amountB,
      })
    )
  }

  /**
   * Because this function is call by the pool creator,
   * so it could be concerned as an trusted setup
   */
  init = (
    srcAPublicKey: PublicKey,
    amountA: bigint,
    srcBPublicKey: PublicKey,
    amountB: bigint,
    dstLPPublicKey: PublicKey,
  ) => {
    const { treasuryA, treasuryB } = this.getTreasuries()

    const srcA = this.rpc.emit<Account>(LedgerActions.GetAccount, srcAPublicKey)
    const srcAmountA = new TwistedElGamal(amountA, srcA.s, srcA.z)
    const dstAmountA = new TwistedElGamal(amountA, treasuryA.s, treasuryA.z)

    const srcB = this.rpc.emit<Account>(LedgerActions.GetAccount, srcBPublicKey)
    const srcAmountB = new TwistedElGamal(amountB, srcB.s, srcB.z)
    const dstAmountB = new TwistedElGamal(amountB, treasuryB.s, treasuryB.z)

    // lp = sqrt(a*b)
    const amountLP = BigInt(
      Math.floor(Math.sqrt(Number(amountA) * Number(amountB))),
    )
    const mint = this.rpc.emit<Account>(
      LedgerActions.GetMint,
      this.mintLPPublicKey,
    )
    const dstLP = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      dstLPPublicKey,
    )
    const srcAmountLP = new TwistedElGamal(amountLP, mint.s, mint.z)
    const dstAmountLP = new TwistedElGamal(amountLP, dstLP.s, dstLP.z)

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
    this.rpc.emit(
      LedgerActions.MintTo,
      srcAmountLP,
      dstAmountLP,
      dstLPPublicKey,
      this.mintLPPublicKey,
    )

    this.rpc.emit(
      AMMEvents.Init,
      srcAPublicKey,
      amountA,
      srcBPublicKey,
      amountB,
      dstLPPublicKey,
      amountLP,
    )
  }

  deposit = (
    srcAPublicKey: PublicKey,
    srcBPublicKey: PublicKey,
    dstLPPublicKey: PublicKey,
    depositProof: DepositProof,
  ) => {
    if (!Deposit.verify(depositProof))
      throw new Error('Invalid proof of deposit')

    const {
      srcAmountA,
      dstAmountA,
      srcAmountB,
      dstAmountB,
      srcAmountLP,
      dstAmountLP,
    } = depositProof

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
    // this.rpc.emit(
    //   LedgerActions.Burn,

    // )

    this.rpc.emit(
      AMMEvents.Deposit,
      srcAPublicKey,
      this.treasuryAPublicKey,
      srcBPublicKey,
      this.treasuryBPublicKey,
      dstLPPublicKey,
      srcAmountA,
      dstAmountA,
      srcAmountB,
      dstAmountB,
      srcAmountLP,
      dstAmountLP,
    )
  }

  withdraw = (
    dstAPublicKey: PublicKey,
    srcAmountA: TwistedElGamal,
    dstAmountA: TwistedElGamal,
    equalityProofA: PerdesenEqualityProof,

    dstBPublicKey: PublicKey,
    srcAmountB: TwistedElGamal,
    dstAmountB: TwistedElGamal,
    equalityProofB: PerdesenEqualityProof,
  ) => {
    if (!PerdesenEquality.verify(srcAmountA.C, dstAmountA.C, equalityProofA))
      throw new Error('Invalid proof of amount A')
    if (!PerdesenEquality.verify(srcAmountB.C, dstAmountB.C, equalityProofB))
      throw new Error('Invalid proof of amount B')

    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountA,
      dstAmountA,
      this.treasuryAPublicKey,
      dstAPublicKey,
      this.mintAPublicKey,
    )
    this.rpc.emit(
      LedgerActions.Transfer,
      srcAmountB,
      dstAmountB,
      this.treasuryBPublicKey,
      dstBPublicKey,
      this.mintBPublicKey,
    )
  }

  swapAB = (
    gamma: bigint,

    srcPublicKey: PublicKey,
    srcAmountA: TwistedElGamal,
    dstAmountA: TwistedElGamal,
    equalityProofA: HybridEqualityProof,

    dstPublicKey: PublicKey,
    srcAmountB: TwistedElGamal,
    dstAmountB: TwistedElGamal,
    equalityProofB: HybridEqualityProof,
  ) => {
    if (!HybridEquality.verify(dstAmountA, srcAmountA, equalityProofA))
      throw new Error('Invalid proof of amount A')
    if (!HybridEquality.verify(srcAmountB, dstAmountB, equalityProofB))
      throw new Error('Invalid proof of amount B')

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

    this.rpc.emit(
      AMMEvents.SwapAB,
      gamma,
      srcPublicKey,
      dstPublicKey,
      srcAmountA,
      dstAmountA,
      srcAmountB,
      dstAmountB,
    )
  }

  swapBA = (
    gamma: bigint,

    srcPublicKey: PublicKey,
    srcAmountB: TwistedElGamal,
    dstAmountB: TwistedElGamal,
    equalityProofB: HybridEqualityProof,

    dstPublicKey: PublicKey,
    srcAmountA: TwistedElGamal,
    dstAmountA: TwistedElGamal,
    equalityProofA: HybridEqualityProof,
  ) => {
    if (!HybridEquality.verify(dstAmountB, srcAmountB, equalityProofB))
      throw new Error('Invalid proof of amount B')
    if (!HybridEquality.verify(srcAmountA, dstAmountA, equalityProofA))
      throw new Error('Invalid proof of amount A')

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

    this.rpc.emit(
      AMMEvents.SwapBA,
      gamma,
      srcPublicKey,
      dstPublicKey,
      srcAmountB,
      dstAmountB,
      srcAmountA,
      dstAmountA,
    )
  }
}
