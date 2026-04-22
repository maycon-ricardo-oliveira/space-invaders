/** @type {import('jest').Config} */
module.exports = {
  displayName: 'game',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-expo|expo|@expo|@shopify/react-native-skia|react-native|@react-native)/)',
  ],
  moduleNameMapper: {
    '^@si/level-engine$': '<rootDir>/../../packages/level-engine/src/index.ts',
    '^@si/monetization-plugin$': '<rootDir>/../../packages/monetization-plugin/src/index.ts',
    '^@si/analytics-plugin$': '<rootDir>/../../packages/analytics-plugin/src/index.ts',
  },
}
