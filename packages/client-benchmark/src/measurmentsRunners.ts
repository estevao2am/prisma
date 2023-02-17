import execa from 'execa'
import path from 'path'

import { generateClient } from './generateClient'
import { getRangeIterator, Range } from './range'
import { Target } from './targets/base'

export type MeasurementResult = {
  numModels: number
  numRelations: number
  numEnums: number
  [key: string]: number
}

type MeasureOneParams = {
  target: Target
  workbenchPath: string
  numRelations: number
  numModels: number
  numEnums: number
  features: string[]
}

export async function measureOne({
  target,
  workbenchPath,
  numModels,
  numRelations,
  numEnums,
  features,
}: MeasureOneParams): Promise<MeasurementResult> {
  await generateClient({ target, workbenchPath, numRelations, numModels: numModels, numEnums, features })
  const measurements = await target.measure(workbenchPath)
  return { numModels, numRelations, numEnums, ...measurements }
}

type MeasureMultipleParams = {
  target: Target
  workbenchPath: string
  models: Range
  relations: Range
  enums: Range
  features: string[]
}

export async function* measureMultiple({
  target,
  workbenchPath,
  models,
  relations,
  enums,
  features,
}: MeasureMultipleParams): AsyncGenerator<MeasurementResult> {
  for (const { numModels, numRelations, numEnums } of getRangeIterator(models, relations, enums)) {
    console.log(`measuring schema with ${numModels} models, ${numRelations} relations and ${numEnums} enums`)
    yield await measureOne({ target, workbenchPath, numModels, numRelations, numEnums, features })
  }
}
