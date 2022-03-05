export enum Direction {
  AB,
  BA,
}

export class Oracle {
  private ra: bigint
  private rb: bigint

  constructor(ra: bigint, rb: bigint) {
    this.ra = ra
    this.rb = rb
  }

  static PRECISION = 10n ** 9n

  price = (inverse: false) => {
    if (inverse) return (this.ra * Oracle.PRECISION) / this.rb
    return (this.rb * Oracle.PRECISION) / this.ra
  }

  swap = (alpha: bigint, direction: Direction = Direction.AB) => {}
}
