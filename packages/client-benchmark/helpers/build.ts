import { build, BuildOptions } from '../../../helpers/compile/build'

const cliConfig: BuildOptions = {
  name: 'measure-cli',
  outfile: 'dist/measureCli',
  entryPoints: ['./src/measureCli'],
  bundle: true,
}

const measureLocalConfig: BuildOptions = {
  name: 'local',
  outfile: 'dist/measureLocal',
  entryPoints: ['./src/measurementsScripts/local'],
  bundle: true,
  external: ['./prisma/client', './node_modules/@prisma/instrumentation'],
}

const measureLambdaConfig: BuildOptions = {
  name: 'local',
  outfile: 'dist/measureLambda',
  entryPoints: ['./src/measurementsScripts/lambda'],
  bundle: true,
  external: ['./prisma/client', './node_modules/@prisma/instrumentation'],
}

void build([cliConfig, measureLocalConfig, measureLambdaConfig])
