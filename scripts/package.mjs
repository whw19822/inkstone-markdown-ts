import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temporaryOutput = path.join(os.tmpdir(), 'inkstone-electron-builder')
const finalOutput = path.join(root, 'dist')
const builderCli = path.join(root, 'node_modules', 'electron-builder', 'cli.js')

await fs.rm(temporaryOutput, { recursive: true, force: true })
await fs.mkdir(temporaryOutput, { recursive: true })

const args = [
  ...(process.argv.includes('--dir') ? ['--dir'] : []),
  `--config.directories.output=${temporaryOutput}`,
]
const result = spawnSync(process.execPath, [builderCli, ...args], { cwd: root, stdio: 'inherit', shell: false })
if (result.status !== 0) process.exit(result.status ?? 1)

await fs.rm(finalOutput, { recursive: true, force: true })
await fs.cp(temporaryOutput, finalOutput, { recursive: true, verbatimSymlinks: true })
await fs.rm(temporaryOutput, { recursive: true, force: true })
console.log(`Inkstone package written to ${finalOutput}`)
