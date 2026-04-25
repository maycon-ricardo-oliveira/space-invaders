/** @type {import('jest').Config} */
module.exports = {
  displayName: 'jogo',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  modulePaths: ['<rootDir>/node_modules'],
  transformIgnorePatterns: [
    '/node_modules/(?!(jest-expo|expo|@expo|expo-modules-core|@shopify/react-native-skia|react-native|@react-native|@react-native-community))',
  ],
  moduleNameMapper: {
    '^@si/level-engine$': '<rootDir>/../../packages/level-engine/src/index.ts',
    '^@si/monetization-plugin$': '<rootDir>/../../packages/monetization-plugin/src/index.ts',
    '^@si/analytics-plugin$': '<rootDir>/../../packages/analytics-plugin/src/index.ts',
  },
}
