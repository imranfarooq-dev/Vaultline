import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions, DbConnectionOptions } from '../../src/database/data-source';

export interface TestDatabase {
  connection: DbConnectionOptions;
  /** Points process.env at this database so AppConfigModule picks it up. */
  applyToEnv(): void;
  stop(): Promise<void>;
}

/**
 * Gives every test file its own empty, migrated PostgreSQL + pgvector database.
 *
 * Default: starts a throwaway `pgvector/pgvector:pg16` container with Testcontainers.
 * Shortcut: set TEST_DB_HOST (e.g. to the docker compose Postgres) to create a
 * uniquely-named database on an existing server instead. Faster, same isolation.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  let container: StartedPostgreSqlContainer | undefined;
  let connection: DbConnectionOptions;
  let dropDatabase = async () => undefined as void;
}
