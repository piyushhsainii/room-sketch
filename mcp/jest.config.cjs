module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/artifacts/', '<rootDir>/.next/'],
  testMatch: ['<rootDir>/mcp/tests/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^server-only$': '<rootDir>/mcp/tests/server-only.cjs' },
  transform: { '^.+\\.tsx?$': '<rootDir>/scripts/test-typescript.cjs' },
};
