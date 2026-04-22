const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: __dirname })

module.exports = createJestConfig({
  displayName: 'calibrator',
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@si/level-engine$': '<rootDir>/../../packages/level-engine/src/index.ts',
  },
})
