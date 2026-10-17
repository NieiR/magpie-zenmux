// Loads the plugin the way Magpie and OpenCode do and checks the shape of
// what it returns: exactly one exported plugin function, a valid config
// hook, an auth hook with provider "zenmux", loader, usage and methods,
// and a provider.models hook. Runs offline with no credentials.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const entry = typeof pkg.exports === "string" ? pkg.exports : pkg.exports?.["."] ?? pkg.main ?? "./index.mjs"

const mod = await import(pathToFileURL(join(root, entry)).href)
const fns = Object.values(mod).filter((v) => typeof v === "function")

const problems = []
if (fns.length !== 1) {
  problems.push(`expected 1 exported plugin function, found ${fns.length}`)
}

const client = {
  app: { log: async () => ({ data: true }) },
  auth: { set: async () => ({ data: true }), remove: async () => ({ data: true }) },
  tui: { showToast: async () => ({ data: true }) },
  config: { get: async () => ({ data: {} }) },
}

for (const fn of fns) {
  const hooks = await fn({ client, directory: root, worktree: root, $: undefined, project: { id: "magpie", worktree: root } })
  const auth = hooks?.auth
  if (!auth) {
    problems.push(`${fn.name}: missing auth hook`)
    continue
  }
  if (auth.provider !== "zenmux") problems.push(`${fn.name}: auth.provider is ${auth.provider}`)
  if (typeof auth.loader !== "function") problems.push(`${fn.name}: missing auth.loader`)
  if (typeof auth.usage !== "function") problems.push(`${fn.name}: missing auth.usage`)
  if (!Array.isArray(auth.methods) || auth.methods.length < 2) problems.push(`${fn.name}: expected 2 auth.methods`)
  for (const m of auth.methods ?? []) {
    if (!["oauth", "api"].includes(m.type)) problems.push(`${fn.name}: invalid method type ${m.type}`)
    if (!m.label) problems.push(`${fn.name}: method missing label`)
  }
  if (typeof hooks.config !== "function") {
    problems.push(`${fn.name}: missing config hook`)
  } else {
    const cfg = { provider: {} }
    await hooks.config(cfg)
    const p = cfg.provider.zenmux
    if (!p || !p.npm || !p.models || !Object.keys(p.models).length) {
      problems.push(`${fn.name}: config hook did not populate provider.zenmux`)
    }
    if (p?.searches !== true) {
      problems.push(`${fn.name}: config hook did not set searches`)
    }
  }
  if (hooks.provider?.id !== "zenmux" || typeof hooks.provider?.models !== "function") {
    problems.push(`${fn.name}: missing provider.models hook`)
  }
}

if (problems.length) {
  console.error(`✗ ${pkg.name}\n  ${problems.join("\n  ")}`)
  process.exit(1)
}
console.log(`✓ ${pkg.name} (${pkg.version})`)
