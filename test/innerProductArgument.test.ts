import { expect } from 'chai'
import {
  InnerProductArgumentProver,
  InnerProductArgumentVerifier,
  ProverParams,
  VerifierParams,
} from '../lib/innerProductArgument'
import { mod, padding, generatorVector, randPoint } from '../lib/utils'
import { PointVector, ScalarVector } from '../lib/vectors'

// Setup
const TARGET = 1825486294856129n
const INDEX = [...Array(64).keys()].map((e) => BigInt(e)) // 0..64
const a = new ScalarVector(
  padding(TARGET.toString(2))
    .split('')
    .map((e) => BigInt(e)),
)
const b = new ScalarVector(INDEX.map((e) => mod(2n ** e)))
const g = new PointVector(generatorVector())
const h = new PointVector(generatorVector())
const q = randPoint()
const C = g
  .mulScalarVector(a)
  .add(h.mulScalarVector(b))
  .add(q.multiply(a.mulScalarVector(b)))

// Verifier
describe('inner product argument', function () {
  let ipap: InnerProductArgumentProver
  const proverParam: ProverParams = {
    sk: { a, b },
    pk: { g, h, q, C },
    xs: [],
  }
  let ipav: InnerProductArgumentVerifier
  // const verifierParam: VerifierParams = {
  //   pk: { g, h, q, C },
  // }

  it('new', () => {
    ipap = new InnerProductArgumentProver(proverParam)
  })

  it('prove/verify (only a single round)', () => {
    const { sk, pk, xs } = ipap.round(proverParam)
    ipav = new InnerProductArgumentVerifier({ pk })
    const ok = ipav.verify({ sk, xs })
    expect(ok).true
  })

  it('prove/verify (succint zk proof; multiple round)', () => {
    const { sk, pk, xs } = ipap.prove()
    ipav = new InnerProductArgumentVerifier({ pk })
    const ok = ipav.verify({ sk, xs })
    expect(ok).true
  })
})
