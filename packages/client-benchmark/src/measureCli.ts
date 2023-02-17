import arg from 'arg'
import { stringify } from 'csv-stringify'
import { createWriteStream } from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

import { clearDir } from './fs'
import { generateTestPackage, LOCAL_VERSION } from './generateTestPackage'
import { MeasurementResult, measureMultiple, measureOne } from './measurmentsRunners'
import { writeGnuplotFile, XColumn } from './plot'
import { parseRange, Range } from './range'
import { Target } from './targets/base'
import { LambdaTarget } from './targets/lambda'
import { LocalTarget } from './targets/local'

const workbenchPath = path.resolve(__dirname, '..', 'workbench')
const resultsPath = path.resolve(__dirname, '..', 'results')
const gnuplotFile = path.join(resultsPath, 'plot.gnuplot')

async function main() {
  const args = arg({
    '--models': String,
    '--target': (value) => {
      switch (value) {
        case 'local':
          return new LocalTarget()
        case 'lambda':
          return new LambdaTarget()
        default:
          throw new Error('--target should be either local or lambda')
      }
    },
    '--relations': String,
    '--enums': String,
    '--features': String,
    '--prisma-version': String,
    '--baseline-version': String,
    '--baseline-features': (value) => {
      if (value === '') {
        return []
      }
      return value.split(',')
    },
  })

  const models = parseRange(args['--models'] ?? '10')
  const relations = parseRange(args['--relations'] ?? '0')
  const enums = parseRange(args['--enums'] ?? '0')
  const features = args['--features']?.split(',') ?? []
  const prismaVersion = args['--prisma-version'] ?? LOCAL_VERSION
  const baseLineVersion = args['--baseline-version']
  const baseLineFeatures = args['--baseline-features']
  const target = args['--target'] ?? new LocalTarget()

  await clearDir(resultsPath)
  if (baseLineVersion || baseLineFeatures) {
    await testVersion({
      target,
      prismaVersion: baseLineVersion ?? prismaVersion,
      features: baseLineFeatures ?? features,
      resultCsv: 'baseline.csv',
      models,
      relations,
      enums,
    })
  }
  await testVersion({ target, prismaVersion, features, resultCsv: 'result.csv', models, relations, enums })

  if (models.kind === 'range' || relations.kind === 'range' || enums.kind === 'range') {
    const xColumn = getPlotXColumn(models, relations, enums)
    if (!(baseLineVersion || baseLineFeatures)) {
      await writeGnuplotFile({
        filePath: gnuplotFile,
        xColumn,
        plot: {
          kind: 'single',
        },
      })
    } else {
      await writeGnuplotFile({
        filePath: gnuplotFile,
        xColumn,
        plot: {
          kind: 'comparison',
          currentTitle: getTitle(prismaVersion, features),
          baselineTitle: getTitle(baseLineVersion ?? prismaVersion, baseLineFeatures ?? features),
        },
      })
    }
  }
}

type TestVersionParams = {
  target: Target
  prismaVersion: string
  features: string[]
  models: Range
  relations: Range
  enums: Range
  resultCsv: string
}

async function testVersion({
  prismaVersion,
  models,
  relations,
  enums,
  resultCsv,
  features,
  target,
}: TestVersionParams) {
  console.log(`generating test package for ${getTitle(prismaVersion, features)}`)
  await generateTestPackage(target, workbenchPath, prismaVersion)

  if (models.kind === 'constant' && relations.kind === 'constant' && enums.kind === 'constant') {
    const measurement = await measureOne({
      target,
      workbenchPath,
      numModels: models.value,
      numRelations: relations.value,
      numEnums: enums.value,
      features,
    })
    console.log('Results:')
    console.log(measurement)
  } else {
    await writeCsv(resultCsv, measureMultiple({ target, workbenchPath, models, relations, enums, features }))
  }
}

async function writeCsv(fileName: string, values: AsyncIterable<MeasurementResult>) {
  const fullCsvPath = path.join(resultsPath, fileName)
  await pipeline(values, stringify({ header: true }), createWriteStream(fullCsvPath))
  console.log(`Results are saved to ${fullCsvPath}`)
}

function getTitle(version: string, features?: string[]) {
  const parts = [version]
  if (features && features.length > 0) {
    parts.push(`(${features.join(', ')})`)
  }
  return parts.join('')
}

function getPlotXColumn(models: Range, relations: Range, enums: Range): XColumn {
  if (models.kind === 'range') {
    return 'models'
  }

  if (relations.kind === 'range') {
    return 'relations'
  }

  return 'enums'
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
