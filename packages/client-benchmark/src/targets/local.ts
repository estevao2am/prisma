import execa from 'execa'
import fs from 'fs/promises'
import path from 'path'

import { Target } from './base'

export class LocalTarget implements Target {
  getBinaryTargets(): string[] {
    return ['native']
  }

  async afterPnpmInstall(workbenchPath: string): Promise<void> {
    await fs.copyFile(path.join(__dirname, 'measureLocal.js'), path.join(workbenchPath, 'measureLocal.js'))
  }

  async afterClientGeneration(workbenchPath: string) {}

  async measure(workbenchPath: string): Promise<Record<string, number>> {
    const { stdout } = await execa('node', [path.join(workbenchPath, 'measureLocal.js')], {
      env: {
        PRISMA_SHOW_ALL_TRACES: 'true',
      },
    })

    return JSON.parse(stdout)
  }
}
