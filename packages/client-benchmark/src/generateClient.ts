import fs from 'fs/promises'
import path from 'path'

import { clearDir } from './fs'
import { pnpmPrismaDbPush } from './pnpm'
import { Target } from './targets/base'

function getHeader(features: string[]) {
  const featuresStr = JSON.stringify(['tracing', ...features])
  return /* Prisma */ `
generator client {
  provider = "prisma-client-js"
  output = "./client"
  previewFeatures = ${featuresStr}
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
}

datasource db {
  provider = "postgresql"
  url = env("TEST_POSTGRES_URI")
}`
}

class Model {
  private fields: string[]
  constructor(readonly name: string) {
    this.fields = []
  }

  addField(field: string) {
    this.fields.push(field)
    return this
  }

  stringify() {
    return `
model ${this.name} {
${this.fields.map((f) => `  ${f}`).join('\n')}
}`
  }
}

function addRelation(from: Model, to: Model, baseName: string) {
  const kind = randomElement(['1:1', '1:m', 'm:n'])

  if (kind === '1:1') {
    from
      .addField(`${baseName}Id String @unique`)
      .addField(`${baseName}Forward ${to.name}? @relation("${baseName}", fields: [${baseName}Id], references: [id])`)

    to.addField(`${baseName}Back ${from.name}? @relation("${baseName}")`)
  } else if (kind === '1:m') {
    from
      .addField(`${baseName}Id String`)
      .addField(`${baseName}Forward ${to.name} @relation("${baseName}", fields: [${baseName}Id], references: [id])`)

    to.addField(`${baseName}Back ${from.name}[] @relation("${baseName}")`)
  } else {
    from.addField(`${baseName}m ${to.name}[] @relation("${baseName}")`)
    to.addField(`${baseName}n ${from.name}[] @relation("${baseName}")`)
  }
}

function genSchemaText(numModels: number, numRelations: number, numEnums: number, features: string[]) {
  const models = [
    new Model('User')
      .addField('id String @id @default(uuid())')
      .addField('email String')
      .addField('fieldA String')
      .addField('fieldB Int')
      .addField('fieldC DateTime'),
  ]

  for (let i = 0; i < numModels - 1; i++) {
    models.push(
      new Model(`Model${i}`)
        .addField('id String @id @default(uuid())')
        .addField('fieldA String')
        .addField('fieldB Int')
        .addField('fieldC DateTime'),
    )
  }

  for (let i = 0; i < numRelations; i++) {
    addRelation(randomElement(models), randomElement(models), `rel${i}`)
  }

  const enums: string[] = []
  for (let i = 0; i < numEnums; i++) {
    const enumName = `Enum${i}`
    randomElement(models).addField(`enum${i} ${enumName}`)
    enums.push(`
enum ${enumName} {
  A
  B
  C
}`)
  }

  return [getHeader(features)]
    .concat(models.map((m) => m.stringify()))
    .concat(enums)
    .join('\n')
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

type GenerateSchemaParams = {
  target: Target
  workbenchPath: string
  numModels: number
  numRelations: number
  numEnums: number
  features: string[]
}

export async function generateClient({
  target,
  workbenchPath,
  numModels,
  numRelations,
  numEnums,
  features,
}: GenerateSchemaParams) {
  await clearDir(path.join(workbenchPath, 'prisma'))

  await fs.writeFile(
    path.join(workbenchPath, 'prisma', 'schema.prisma'),
    genSchemaText(numModels, numRelations, numEnums, features),
    'utf-8',
  )

  await pnpmPrismaDbPush(workbenchPath)
  await target.afterClientGeneration(workbenchPath)
}
