// this code will be copied into workbench directory, so prisma packages paths are relative to it
// @ts-ignore Does not exist during build, but will exist during the execution
import { PrismaInstrumentation } from './node_modules/@prisma/instrumentation'
import { BenchmarkSpanExporter, setupOtel } from './otel'

const exporter = new BenchmarkSpanExporter()

setupOtel(exporter, new PrismaInstrumentation())
const { trace } = require('@opentelemetry/api')

const tracer = trace.getTracer('benchmark')

const requireSpan = tracer.startSpan('benchmark:requireClient')
const fullSpan = tracer.startSpan('benchmark:total')
const { PrismaClient } = require('./prisma/client')

requireSpan.end()

export async function runMeasurement() {
  let prisma

  try {
    prisma = new PrismaClient()
    await prisma.$connect()
    await prisma.user.findMany({})
  } finally {
    fullSpan.end()
    await prisma?.$disconnect()
  }

  const results = exporter.results
  const memory = process.memoryUsage()
  results['heap'] = memory.heapUsed
  results['rss'] = memory.rss
  return results
}
