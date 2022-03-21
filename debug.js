const fs = require('fs')
const data = require('./lib/hashmap/hashmap_0_1048576.json')

const LOOP = 2 ** 16
const COUNTER = 2 ** 4

for (let i = 0; i < COUNTER; i++) {
  const name = `hashmap_${i * LOOP}_${(i + 1) * LOOP}.json`
  const path = __dirname + `/hashmap/${name}`
  const hashmap = {}
  for (let j = i * LOOP; j < (i + 1) * LOOP; j++) hashmap[data[j]] = j
  fs.writeFileSync(path, JSON.stringify(hashmap, null, 2))
}
