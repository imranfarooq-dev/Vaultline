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
