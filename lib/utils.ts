import { utils, CURVE } from '@noble/ed25519'

export const randToxic = () => {
  const hex = utils.randomBytes(32)
  const seed = BigInt('0x' + Buffer.from(hex).toString('hex'))
  const toxic = utils.mod(seed, CURVE.l)
  return toxic
}

export const mod = (n: bigint) => {
  return utils.mod(n, CURVE.l)
}

export const invert = (n: bigint) => {
  return utils.invert(n, CURVE.l)
}
