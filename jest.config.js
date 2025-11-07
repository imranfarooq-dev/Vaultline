/**
 * Jest is split into "projects" so each kind of test can be run on its own:
 *
 *   unit         fast, no Docker, no network        -> src/**\/*.spec.ts
 *   contract     event/API shape guarantees           -> test/contract
 *   integration  real Postgres + Kafka via Testcontainers (needs Docker)
 *   e2e          whole HTTP app against real Postgres (needs Docker)
 */
const tsJest = ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }];

const base = {
  rootDir: __dirname,
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': tsJest },
  testEnvironment: 'node',
};

module.exports = {
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts', '!src/database/migrations/**'],
  projects: [
    { ...base, displayName: 'unit', testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/docs/**/*.spec.ts'] },
    { ...base, displayName: 'contract', testMatch: ['<rootDir>/test/contract/**/*.contract-spec.ts'] },
    { ...base, displayName: 'integration', testMatch: ['<rootDir>/test/integration/**/*.int-spec.ts'], setupFilesAfterEnv: ['<rootDir>/test/support/long-timeout.ts'] },
    { ...base, displayName: 'e2e', testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'], setupFilesAfterEnv: ['<rootDir>/test/support/long-timeout.ts'] },
  ],
};
