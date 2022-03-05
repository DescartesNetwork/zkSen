import { expect } from 'chai'
import { LedgerActions, Ledger } from '../lib/zkswap/ledger'
import { PublicKey } from '@solana/web3.js'
import { RPC } from '../lib/zkswap/rpc'
import { Account, Mint } from '../lib/zkswap/ledger/spl'
import { TwistedElGamal } from '../lib/zkswap/twistedElGamal'

const supply = 1_000_000_000n
const amount = 1_000_000n

describe('ledger core', function () {
  const rpc = new RPC()
  const ledger = new Ledger(rpc)
  let mintPublicKey: PublicKey, srcPublicKey: PublicKey, dstPublicKey: PublicKey

  before(() => {
    ledger.start()
  })

  it('initialize mint', () => {
    mintPublicKey = ledger.initializeMint()
  })

  it('initialize account', () => {
    srcPublicKey = ledger.initializeAccount(mintPublicKey)
    dstPublicKey = ledger.initializeAccount(mintPublicKey)
  })

  it('mint to', () => {
    const mint = ledger.getMint(mintPublicKey)
    const account = ledger.getAccount(srcPublicKey)
    ledger.mintTo(
      new TwistedElGamal(supply, mint.s),
      new TwistedElGamal(supply, account.s),
      srcPublicKey,
      mintPublicKey,
    )
    const ok =
      mint.supply.verify(supply, mint.s) &&
      account.amount.verify(supply, account.s)
    expect(ok).true
  })

  it('transfer', () => {
    const srcAccount = ledger.getAccount(srcPublicKey)
    const dstAccount = ledger.getAccount(dstPublicKey)
    ledger.transfer(
      new TwistedElGamal(amount, srcAccount.s),
      new TwistedElGamal(amount, dstAccount.s),
      srcPublicKey,
      dstPublicKey,
      mintPublicKey,
    )
    const ok =
      srcAccount.amount.verify(supply - amount, srcAccount.s) &&
      dstAccount.amount.verify(amount, dstAccount.s)
    expect(ok).true
  })
})

describe('ledger events', function () {
  const rpc = new RPC()
  const ledger = new Ledger(rpc)
  let mintPublicKey: PublicKey, srcPublicKey: PublicKey, dstPublicKey: PublicKey

  before(() => {
    ledger.start()
  })

  it('initialize mint', () => {
    mintPublicKey = rpc.emit<PublicKey>(LedgerActions.InitializeMint)
  })

  it('initialize account', () => {
    srcPublicKey = rpc.emit<PublicKey>(
      LedgerActions.InitializeAccount,
      mintPublicKey,
    )
    dstPublicKey = rpc.emit<PublicKey>(
      LedgerActions.InitializeAccount,
      mintPublicKey,
    )
  })

  it('mint to', () => {
    const mint = rpc.emit<Mint>(LedgerActions.GetMint, mintPublicKey)
    const account = rpc.emit<Account>(LedgerActions.GetAccount, srcPublicKey)
    rpc.emit(
      LedgerActions.MintTo,
      new TwistedElGamal(supply, mint.s),
      new TwistedElGamal(supply, account.s),
      srcPublicKey,
      mintPublicKey,
    )
    const ok =
      mint.supply.verify(supply, mint.s) &&
      account.amount.verify(supply, account.s)
    expect(ok).true
  })

  it('transfer', () => {
    const srcAccount = rpc.emit<Account>(LedgerActions.GetAccount, srcPublicKey)
    const dstAccount = rpc.emit<Account>(LedgerActions.GetAccount, dstPublicKey)
    rpc.emit(
      LedgerActions.Transfer,
      new TwistedElGamal(amount, srcAccount.s),
      new TwistedElGamal(amount, dstAccount.s),
      srcPublicKey,
      dstPublicKey,
      mintPublicKey,
    )
    const ok =
      srcAccount.amount.verify(supply - amount, srcAccount.s) &&
      dstAccount.amount.verify(amount, dstAccount.s)
    expect(ok).true
  })
})
