// Metro configuration tuned for the pnpm + turborepo monorepo.
//
// In a workspace the app's dependencies are hoisted to the repo root, and some
// shared code lives outside this app's folder (packages/*). Metro only watches
// the project directory by default, so we widen it to the workspace root and
// tell it to resolve modules from both the app's and the root node_modules.
// See https://docs.expo.dev/guides/monorepos/.
import { getDefaultConfig } from 'expo/metro-config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo so changes to shared packages are
//    picked up by fast refresh.
config.watchFolders = [workspaceRoot]

// 2. Let Metro resolve packages from the app first, then fall back to the
//    hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

export default config
