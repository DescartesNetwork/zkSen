import { RPC } from './rpc'
import { AMM, AMMEvents } from './amm'
import { PublicKey } from '@solana/web3.js'
import { LedgerActions } from './ledger'
import { Account } from './ledger/spl'
import { Swap } from './zk'

export class Oracle {
  private rpc: RPC
  private ra: bigint
  private rb: bigint

  constructor(rpc: RPC) {
    this.rpc = rpc
    this.ra = 0n
    this.rb = 0n
  }

  start = () => {
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
        console.log(AMMEvents.Init, this.ra, this.rb)
      },
    )
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
        this.ra = (this.ra * gamma) / AMM.PRECISION
        this.rb = (this.rb * AMM.PRECISION) / gamma
        console.log(AMMEvents.SwapAB, this.ra, this.rb)
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
  ) => {
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

    const proof = Swap.prove(
      gamma,
      this.ra,
      this.rb,
      srcA.amount,
      dstB.amount,
      treasuryA,
      treasuryB,
    )

    const ok = Swap.verify(treasuryA.amount, treasuryB.amount, proof)
    console.log(ok)

    return proof
  }
}
