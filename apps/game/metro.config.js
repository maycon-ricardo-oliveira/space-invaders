const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch changes in monorepo packages
config.watchFolders = [monorepoRoot]

// Resolve modules from monorepo root first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force-stub reanimated so Skia uses StaticContainer (no worklets runtime needed).
// resolveRequest has highest priority, overrides anything in node_modules.
// Our game uses no Reanimated Skia APIs, so this is safe.
const reanimatedStub = path.resolve(projectRoot, 'stubs/react-native-reanimated.js')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    return { filePath: reanimatedStub, type: 'sourceFile' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
