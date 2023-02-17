import { runMeasurement } from './base'

runMeasurement()
  .then((results) => console.log(JSON.stringify(results)))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
