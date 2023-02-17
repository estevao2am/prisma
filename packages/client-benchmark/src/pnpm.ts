import execa from 'execa'

export async function pnpmInstall(cwd: string) {
  await pnpm(['install'], cwd)
}

export async function pnpmPrismaDbPush(cwd: string) {
  await pnpm(['prisma', 'db', 'push', '--accept-data-loss', '--force-reset', '--skip-generate'], cwd)
  await pnpm(['prisma', 'generate'], cwd)
}

async function pnpm(command: string[], cwd: string) {
  await execa('pnpm', command, { cwd })
}
