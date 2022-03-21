import { Point } from 'point'
import { randScalar } from 'utils'
import { hash } from 'tweetnacl'

/**
 * Fiat-Shamir heuristic
 * @param args
 * @returns
 */
export const noninteractive = (...args: Point[]): bigint => {
  const seed = args.reduce(
    (prev, cur) => new Uint8Array([...prev, ...cur.toRawBytes()]),
    new Uint8Array([]),
  )
  const c = randScalar(hash(seed))
  return c
}
