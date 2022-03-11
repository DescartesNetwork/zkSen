import { Point } from './lib/point'
import * as fs from 'fs'
import { parse } from 'csv-parse'

const START = 0
const END = 2 ** 20
const name = `hashmap_${START}_${END}`
const csvPath = __dirname + `/lib/hashmap/${name}.csv`
const jsonPath = __dirname + `/lib/hashmap/${name}.json`

const mode = true

if (mode) {
  // Build csv file only
  fs.writeFileSync(csvPath, '')
  for (let i = START; i < END; i++) {
    const s = BigInt(i)
    const p = Point.G.multiply(s).toHex()
    if (i % 1000 === 0) console.log(i, p)
    fs.appendFileSync(csvPath, `${p}\n`)
  }
} else {
  // Read csv and build json file only
  fs.createReadStream(csvPath).pipe(
    parse((er, data) => {
      const hashmap = data.flat()
      fs.writeFileSync(jsonPath, JSON.stringify(hashmap, null, 2))
      console.log(`Successfully loaded the hashmap with ${data.length} records`)
    }),
  )
}
