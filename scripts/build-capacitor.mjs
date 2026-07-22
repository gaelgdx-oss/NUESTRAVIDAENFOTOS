import { spawnSync } from 'node:child_process'

process.env.CAPACITOR_BUILD = '1'

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
