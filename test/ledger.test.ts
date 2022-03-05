import { expect } from 'chai'
import { Ledger } from '../lib/zkswap/ledger'
import { PublicKey } from '@solana/web3.js'

const supply = 1_000_000_000n
const amount = 1_000_000n

describe('ledger', function () {
  const ledger = new Ledger()
  let mintPublicKey: PublicKey, srcPublicKey: PublicKey, dstPublicKey: PublicKey

  it('initialize mint', () => {
    mintPublicKey = ledger.initializeMint()
  })

  it('initialize account', () => {
    srcPublicKey = ledger.initializeAccount(mintPublicKey)
    dstPublicKey = ledger.initializeAccount(mintPublicKey)
  })

  it('mint to', () => {
    ledger.mintTo(srcPublicKey, supply, mintPublicKey)
    const mint = ledger.findMint(mintPublicKey)
    if (!mint) throw new Error('Cannot fint the mint')
    const account = mint.findAccount(srcPublicKey)
    if (!account) throw new Error('Cannot fint the account')
    const ok =
      mint.supply.verify(supply, mint.s) &&
      account.amount.verify(supply, account.s)
    expect(ok).true
  })

  it('transfer', () => {
    ledger.transfer(srcPublicKey, dstPublicKey, amount, mintPublicKey)
    const srcAccount = ledger.findMint(mintPublicKey)?.findAccount(srcPublicKey)
    const dstAccount = ledger.findMint(mintPublicKey)?.findAccount(dstPublicKey)
    if (!srcAccount || !dstAccount) throw new Error('Cannot fint the account')
    const ok =
      srcAccount.amount.verify(supply - amount, srcAccount.s) &&
      dstAccount.amount.verify(amount, dstAccount.s)
    expect(ok).true
  })
})
