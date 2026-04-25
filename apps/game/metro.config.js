const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch changes in monorepo packages so hot-reload works during development
config.watchFolders = [monorepoRoot]

// Resolve modules from app node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Redirect react-native-reanimated to our stub so Skia uses StaticContainer
const reanimatedStub = path.resolve(projectRoot, 'stubs/react-native-reanimated.js')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    return { filePath: reanimatedStub, type: 'sourceFile' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
