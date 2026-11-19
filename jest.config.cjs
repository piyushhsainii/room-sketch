module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/components/workspace/tests/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: { '^.+\\.tsx?$': '<rootDir>/scripts/test-typescript.cjs' },
};
