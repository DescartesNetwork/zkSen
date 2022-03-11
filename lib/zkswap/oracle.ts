import { PublicKey } from '@solana/web3.js'
import { ProductConstant, ProductConstantProof } from 'nizk'
import { RPC } from './rpc'
import { AMM, AMMEvents } from './amm'
import { LedgerActions } from './ledger'
import { Account } from './ledger/spl'
import { TwistedElGamal } from 'twistedElGamal'

export class Oracle {
  private rpc: RPC
  private ra: bigint
  private rb: bigint
  private lp: bigint

  constructor(rpc: RPC) {
    this.rpc = rpc
    this.ra = 0n
    this.rb = 0n
    this.lp = 0n
  }

  start = () => {
    // Init listener
    this.rpc.on(
      AMMEvents.Init,
      (
        srcAPublicKey,
        amountA,
        srcBPublicKey,
        amountB,
        dstLPPublicKey,
        amountLP,
      ) => {
        this.ra = amountA
        this.rb = amountB
        this.lp = amountLP
        console.log(AMMEvents.Init, this.ra, this.rb)
      },
    )
    // Swap A to B listener
    this.rpc.on(
      AMMEvents.SwapAB,
      (
        gamma,
        srcPublicKey,
        dstPublicKey,
        srcAmountA,
        dstAmountA,
        srcAmountB,
        dstAmountB,
      ) => {
        const bidAdjustmentAmount =
          this.ra * AMM.PRECISION - ((this.ra * AMM.PRECISION) / gamma) * gamma
        this.ra = (this.ra * AMM.PRECISION - bidAdjustmentAmount) / gamma
        const askAdjustmentAmount =
          this.rb * gamma - ((this.rb * gamma) / AMM.PRECISION) * AMM.PRECISION
        this.rb = (this.rb * gamma - askAdjustmentAmount) / AMM.PRECISION
        console.log(AMMEvents.SwapAB, this.ra, this.rb)
      },
    )
    // Swap B to A listener
    this.rpc.on(
      AMMEvents.SwapBA,
      (
        gamma,
        srcPublicKey,
        dstPublicKey,
        srcAmountA,
        dstAmountA,
        srcAmountB,
        dstAmountB,
      ) => {
        const bidAdjustmentAmount =
          this.rb * AMM.PRECISION - ((this.rb * AMM.PRECISION) / gamma) * gamma
        this.rb = (this.rb * AMM.PRECISION - bidAdjustmentAmount) / gamma
        const askAdjustmentAmount =
          this.ra * gamma - ((this.ra * gamma) / AMM.PRECISION) * AMM.PRECISION
        this.ra = (this.ra * gamma - askAdjustmentAmount) / AMM.PRECISION
        console.log(AMMEvents.SwapAB, this.ra, this.rb)
      },
    )
    // Deposit listener
    this.rpc.on(
      AMMEvents.Deposit,
      (
        srcAPublicKey,
        dstAPublicKey: PublicKey,
        srcBPublicKey,
        dstBPublicKey: PublicKey,
        dstLPPublicKey,
        srcAmountA,
        dstAmountA: TwistedElGamal,
        srcAmountB,
        dstAmountB: TwistedElGamal,
        srcAmountLP,
        dstAmountLP,
      ) => {
        const treasuryA = this.rpc.emit<Account>(
          LedgerActions.GetAccount,
          dstAPublicKey,
        )
        const treasuryB = this.rpc.emit<Account>(
          LedgerActions.GetAccount,
          dstBPublicKey,
        )
        const a = dstAmountA.solve(treasuryA.s)
        const b = dstAmountB.solve(treasuryB.s)
        if (!a || !b) throw new Error('Cannot solve the discrete log problem')
        this.ra += a
        this.rb += b
        console.log(AMMEvents.Deposit, this.ra, this.rb)
      },
    )
    // Withdraw listener
    this.rpc.on(
      AMMEvents.Withdraw,
      (
        srcAPublicKey: PublicKey,
        dstAPublicKey,
        srcBPublicKey: PublicKey,
        dstBPublicKey,
        srcLPPublicKey,
        srcAmountA,
        dstAmountA: TwistedElGamal,
        srcAmountB,
        dstAmountB: TwistedElGamal,
        srcAmountLP,
        dstAmountLP,
      ) => {
        const treasuryA = this.rpc.emit<Account>(
          LedgerActions.GetAccount,
          srcAPublicKey,
        )
        const treasuryB = this.rpc.emit<Account>(
          LedgerActions.GetAccount,
          srcBPublicKey,
        )
        const a = srcAmountA.solve(treasuryA.s)
        const b = srcAmountB.solve(treasuryB.s)
        if (!a || !b) throw new Error('Cannot solve the discrete log problem')
        this.ra -= a
        this.rb -= b
        console.log(AMMEvents.Withdraw, this.ra, this.rb)
      },
    )
  }

  price = (inverse: false) => {
    if (inverse) return (this.ra * AMM.PRECISION) / this.rb
    return (this.rb * AMM.PRECISION) / this.ra
  }

  swapAB = (
    gamma: bigint,
    srcAPublicKey: PublicKey,
    dstBPublicKey: PublicKey,
    treasuryAPublicKey: PublicKey,
    treasuryBPublicKey: PublicKey,
  ): ProductConstantProof => {
    const srcA = this.rpc.emit<Account>(LedgerActions.GetAccount, srcAPublicKey)
    const dstB = this.rpc.emit<Account>(LedgerActions.GetAccount, dstBPublicKey)
    const treasuryA = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      treasuryAPublicKey,
    )
    const treasuryB = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      treasuryBPublicKey,
    )

    const proof = ProductConstant.prove(
      gamma,
      this.ra,
      this.rb,
      srcA.amount,
      dstB.amount,
      treasuryA,
      treasuryB,
    )

    return proof
  }

  swapBA = (
    gamma: bigint,
    srcBPublicKey: PublicKey,
    dstAPublicKey: PublicKey,
    treasuryBPublicKey: PublicKey,
    treasuryAPublicKey: PublicKey,
  ): ProductConstantProof => {
    const srcB = this.rpc.emit<Account>(LedgerActions.GetAccount, srcBPublicKey)
    const dstA = this.rpc.emit<Account>(LedgerActions.GetAccount, dstAPublicKey)
    const treasuryA = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      treasuryAPublicKey,
    )
    const treasuryB = this.rpc.emit<Account>(
      LedgerActions.GetAccount,
      treasuryBPublicKey,
    )

    const proof = ProductConstant.prove(
      gamma,
      this.rb,
      this.ra,
      srcB.amount,
      dstA.amount,
      treasuryB,
      treasuryA,
    )

    return proof
  }
}
