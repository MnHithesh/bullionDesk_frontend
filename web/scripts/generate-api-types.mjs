// Generates src/api/schema/<service>.ts from the gateway's OpenAPI documents.
//   npm run api:types                      → reads http://localhost:5000/openapi/<service>/v1.json (gateway must be running)
//   OPENAPI_BASE=http://host:port npm run api:types
//   OPENAPI_DIR=./openapi npm run api:types → reads ./openapi/<service>.json files instead
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const services = ['identity', 'wallet', 'marketdata', 'order', 'portfolio', 'risk']
const base = process.env.OPENAPI_BASE ?? 'http://localhost:5000'
const dir = process.env.OPENAPI_DIR
const cli = fileURLToPath(new URL('../node_modules/openapi-typescript/bin/cli.js', import.meta.url))

let failed = 0
for (const service of services) {
  const source = dir ? join(dir, `${service}.json`) : `${base}/openapi/${service}/v1.json`
  const output = `src/api/schema/${service}.ts`
  if (dir && !existsSync(source)) {
    console.warn(`skip ${service}: ${source} not found`)
    continue
  }
  try {
    execFileSync(process.execPath, [cli, source, '-o', output], { stdio: 'inherit' })
  } catch {
    failed++
    console.error(`failed ${service}: could not read ${source}`)
  }
}

if (failed) {
  console.error(`\n${failed} service(s) failed. Is the gateway running on ${base}?`)
  process.exit(1)
}
