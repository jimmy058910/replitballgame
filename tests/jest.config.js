module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'server/**/*.{js,ts}',
    '!server/**/*.d.ts',
    '!server/test/**',
    '!server/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  maxWorkers: 1,
  projects: [
    {
      displayName: 'Automated Systems',
      testMatch: ['<rootDir>/tests/automated/**/*.test.js'],
    },
    {
      displayName: 'Manual Functions',
      testMatch: ['<rootDir>/tests/manual/**/*.test.js'],
    },
    {
      displayName: 'API Routes',
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
    },
    {
      displayName: 'Services',
      testMatch: ['<rootDir>/tests/services/**/*.test.js'],
    },
    {
      displayName: 'Database',
      testMatch: ['<rootDir>/tests/database/**/*.test.js'],
    },
    {
      displayName: 'Integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
    },
  ],
};