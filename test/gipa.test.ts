import { expect } from 'chai'
import { Machine, CommitmentKey, range } from '../lib/gipa/generator'
import { Prover } from '../lib/gipa/prover'
import { Verifier } from '../lib/gipa/verifier'
import { mod, padding } from '../lib/utils'
import { ScalarVector } from '../lib/vectors'

const TARGET = 1825486294856129n

// Verifier
describe('inner product argument', function () {
  let ipap: Prover
  let ipav: Verifier
  // Public knowledge
  const pk = Machine.generate()
  // Commiment key
  const a = new ScalarVector(
    padding(TARGET.toString(2))
      .split('')
      .map((e) => BigInt(e)),
  )
  const b = new ScalarVector(range(64).map((i) => mod(2n ** i)))
  const ck: CommitmentKey = { a, b }

  it('new', () => {
    ipap = new Prover(pk)
    ipav = new Verifier(pk)
  })

  it('prove/verify (succint zk proof; multiple round)', () => {
    const c = ipap.commit(ck)
    const zk = ipap.prove(c, ck)
    const ok = ipav.verify(c, zk)
    expect(ok).true
  })
})
