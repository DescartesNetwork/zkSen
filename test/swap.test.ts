import { PublicKey } from '@solana/web3.js'
import { expect } from 'chai'
import { Ledger } from '../lib/zkswap/ledger'
import { Oracle } from '../lib/zkswap/oracle'
import { RPC } from '../lib/zkswap/rpc'
import { AMM } from '../lib/zkswap/amm'
import { TwistedElGamal } from '../lib/zkswap/twistedElGamal'
import { Deposit, PerdesenEquality, ProductConstant } from '../lib/zk'

const supply = 1_000_000_000n
const deposit = 100_000_000n
// gamma = 0.0002
const gamma = AMM.PRECISION - 200_000n
// expected amount = gamma / 10^9 x 100_000_000 = 20_000
const amount = (gamma * deposit) / AMM.PRECISION

describe('amm & oracle', function () {
  const rpc = new RPC()
  const ledger = new Ledger(rpc)
  const oracle = new Oracle(rpc)
  let amm: AMM,
    mintAPublicKey: PublicKey,
    mintBPublicKey: PublicKey,
    mintLPPublicKey: PublicKey,
    accountAPublicKey: PublicKey,
    accountBPublicKey: PublicKey,
    accountLPPublicKey: PublicKey

  before(() => {
    ledger.start()
    oracle.start()
    // Init accounts
    mintAPublicKey = ledger.initializeMint()
    mintBPublicKey = ledger.initializeMint()
    mintLPPublicKey = ledger.initializeMint()
    accountAPublicKey = ledger.initializeAccount(mintAPublicKey)
    accountBPublicKey = ledger.initializeAccount(mintBPublicKey)
    accountLPPublicKey = ledger.initializeAccount(mintLPPublicKey)
    // Get accounts
    const mintA = ledger.getMint(mintAPublicKey)
    const mintB = ledger.getMint(mintBPublicKey)
    const accountA = ledger.getAccount(accountAPublicKey)
    const accountB = ledger.getAccount(accountBPublicKey)
    // Mint to accounts
    ledger.mintTo(
      new TwistedElGamal(supply, mintA.s),
      new TwistedElGamal(supply, accountA.s),
      accountAPublicKey,
      mintAPublicKey,
    )
    ledger.mintTo(
      new TwistedElGamal(supply, mintB.s),
      new TwistedElGamal(supply, accountB.s),
      accountBPublicKey,
      mintBPublicKey,
    )
    // Init AMM
    amm = new AMM(rpc, mintAPublicKey, mintBPublicKey, mintLPPublicKey)
  })

  it('init', () => {
    const accountA = ledger.getAccount(accountAPublicKey)
    const accountB = ledger.getAccount(accountBPublicKey)
    const accountLP = ledger.getAccount(accountLPPublicKey)
    const { treasuryA, treasuryB } = amm.getTreasuries()
    amm.init(
      accountAPublicKey,
      deposit,
      accountBPublicKey,
      deposit,
      accountLPPublicKey,
    )
    const ok =
      accountA.amount.verify(supply - deposit, accountA.s) &&
      accountB.amount.verify(supply - deposit, accountB.s) &&
      treasuryA.amount.verify(deposit, treasuryA.s) &&
      treasuryB.amount.verify(deposit, treasuryB.s) &&
      accountLP.amount.verify(deposit, accountLP.s)

    expect(ok).true
  })

  it('deposit', () => {
    const accountA = ledger.getAccount(accountAPublicKey)
    const accountB = ledger.getAccount(accountBPublicKey)
    const accountLP = ledger.getAccount(accountLPPublicKey)
    const { treasuryA, treasuryB } = amm.getTreasuries()

    const depositProof = Deposit.prove(
      deposit,
      deposit,
      accountA,
      accountB,
      accountLP,
      treasuryA.amount.P,
      treasuryB.amount.P,
      accountLP.amount.P,
    )

    amm.deposit(accountAPublicKey, accountBPublicKey, depositProof)
    // Including the deposit amount of init
    const ok =
      accountA.amount.verify(supply - 2n * deposit, accountA.s) &&
      accountB.amount.verify(supply - 2n * deposit, accountB.s) &&
      treasuryA.amount.verify(2n * deposit, treasuryA.s) &&
      treasuryB.amount.verify(2n * deposit, treasuryB.s)
    expect(ok).true
  })

  // it('withdraw', () => {
  //   const accountA = ledger.getAccount(accountAPublicKey)
  //   const accountB = ledger.getAccount(accountBPublicKey)
  //   const { treasuryA, treasuryB } = amm.getTreasuries()

  //   const srcAmounntA = new TwistedElGamal(deposit, treasuryA.s, treasuryA.z)
  //   const dstAmounntA = new TwistedElGamal(deposit, accountA.s, accountA.z)
  //   const srcAmounntB = new TwistedElGamal(deposit, treasuryB.s, treasuryB.z)
  //   const dstAmounntB = new TwistedElGamal(deposit, accountB.s, accountB.z)

  //   const equalityProofA = PerdesenEquality.prove(
  //     deposit,
  //     treasuryA.z,
  //     accountA.z,
  //     srcAmounntA.C,
  //     dstAmounntA.C,
  //   )
  //   const equalityProofB = PerdesenEquality.prove(
  //     deposit,
  //     treasuryB.z,
  //     accountB.z,
  //     srcAmounntB.C,
  //     dstAmounntB.C,
  //   )
  //   amm.withdraw(
  //     accountAPublicKey,
  //     srcAmounntA,
  //     dstAmounntA,
  //     equalityProofA,
  //     accountBPublicKey,
  //     srcAmounntB,
  //     dstAmounntB,
  //     equalityProofB,
  //   )
  //   // Including the deposit amount of init
  //   const ok =
  //     accountA.amount.verify(supply - deposit, accountA.s) &&
  //     accountB.amount.verify(supply - deposit, accountB.s) &&
  //     treasuryA.amount.verify(deposit, treasuryA.s) &&
  //     treasuryB.amount.verify(deposit, treasuryB.s)
  //   expect(ok).true
  // })

  it('swap A to B', () => {
    const accountA = ledger.getAccount(accountAPublicKey)
    const accountB = ledger.getAccount(accountBPublicKey)
    const { treasuryA, treasuryB } = amm.getTreasuries()

    const {
      srcBidAmount,
      dstAskAmount,
      bidAdjustment,
      askAdjustment,
      equalityBidProof,
      equalityAskProof,
    } = oracle.swapAB(
      gamma,
      accountAPublicKey,
      accountBPublicKey,
      amm.treasuryAPublicKey,
      amm.treasuryBPublicKey,
    )

    const dstBidAmount = ProductConstant.computeDstBidAmount(
      gamma,
      treasuryA.amount,
      bidAdjustment,
    )
    const srcAskAmount = ProductConstant.computeSrcAskAmount(
      gamma,
      treasuryB.amount,
      askAdjustment,
    )

    amm.swapAB(
      gamma,

      accountAPublicKey,
      srcBidAmount,
      dstBidAmount,
      equalityBidProof,

      accountBPublicKey,
      srcAskAmount,
      dstAskAmount,
      equalityAskProof,
    )
    const ok =
      accountA.amount.verify(supply - deposit - 20004n, accountA.s) &&
      accountB.amount.verify(supply - deposit + 20000n, accountB.s) &&
      treasuryA.amount.verify(deposit + 20004n, treasuryA.s) &&
      treasuryB.amount.verify(deposit - 20000n, treasuryB.s)

    expect(ok).true
  })
})
