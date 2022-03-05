import { PublicKey } from '@solana/web3.js'
import { expect } from 'chai'
import { Ledger } from '../lib/zkswap/ledger'
import { RPC } from '../lib/zkswap/rpc'
import { Swap } from '../lib/zkswap/Swap'
import { TwistedElGamal } from '../lib/zkswap/twistedElGamal'

const supply = 1_000_000_000n
const deposit = 500_000_000n
const amount = 100_000n

describe('swap', function () {
  const rpc = new RPC()
  const ledger = new Ledger(rpc)
  let swap: Swap,
    mintAPublicKey: PublicKey,
    mintBPublicKey: PublicKey,
    accountAPublicKey: PublicKey,
    accountBPublicKey: PublicKey

  before(() => {
    ledger.start()
    // Init accounts
    mintAPublicKey = ledger.initializeMint()
    mintBPublicKey = ledger.initializeMint()
    accountAPublicKey = ledger.initializeAccount(mintAPublicKey)
    accountBPublicKey = ledger.initializeAccount(mintBPublicKey)
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
    // Init Swap
    swap = new Swap(rpc, mintAPublicKey, mintBPublicKey)
  })

  it('deposit', () => {
    const accountA = ledger.getAccount(accountAPublicKey)
    const accountB = ledger.getAccount(accountBPublicKey)
    const { treasuryA, treasuryB } = swap.getTreasuries()
    swap.deposit(
      accountAPublicKey,
      accountBPublicKey,
      new TwistedElGamal(deposit, accountA.s),
      new TwistedElGamal(deposit, treasuryA.s),
      new TwistedElGamal(deposit, accountB.s),
      new TwistedElGamal(deposit, treasuryB.s),
    )
    const ok =
      accountA.amount.verify(supply - deposit, accountA.s) &&
      accountB.amount.verify(supply - deposit, accountB.s) &&
      treasuryA.amount.verify(deposit, treasuryA.s) &&
      treasuryB.amount.verify(deposit, treasuryB.s)
    expect(ok).true
  })

  it('swap A to B', () => {
    const accountA = ledger.getAccount(accountAPublicKey)
    const accountB = ledger.getAccount(accountBPublicKey)
    const { treasuryA, treasuryB } = swap.getTreasuries()
    swap.swapAB(
      200_000n, // 0.0002 x 500_000_000 = 100_000
      accountAPublicKey,
      accountBPublicKey,
      new TwistedElGamal(amount, accountA.s),
      new TwistedElGamal(amount, treasuryA.s),
      new TwistedElGamal(amount, treasuryB.s),
      new TwistedElGamal(amount, accountB.s),
    )
    const ok =
      accountA.amount.verify(supply - deposit - amount, accountA.s) &&
      accountB.amount.verify(supply - deposit + amount, accountB.s) &&
      treasuryA.amount.verify(deposit + amount, treasuryA.s) &&
      treasuryB.amount.verify(deposit - amount, treasuryB.s)
    expect(ok).true
  })
})
