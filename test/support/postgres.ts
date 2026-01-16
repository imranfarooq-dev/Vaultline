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

  if (process.env.TEST_DB_HOST) {
    const admin = {
      host: process.env.TEST_DB_HOST,
      port: Number(process.env.TEST_DB_PORT ?? 5432),
      user: process.env.TEST_DB_USER ?? 'bank',
      password: process.env.TEST_DB_PASSWORD ?? 'bank_password',
    };
    const database = `test_${randomBytes(6).toString('hex')}`;
    const client = new Client({ ...admin, database: 'postgres' });
    await client.connect();
    await client.query(`CREATE DATABASE ${database}`);
    await client.end();
    connection = { host: admin.host, port: admin.port, username: admin.user, password: admin.password, database };
    dropDatabase = async () => {
      const c = new Client({ ...admin, database: 'postgres' });
      await c.connect();
      await c.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
      await c.end();
    };
  } else {
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16').withDatabase('bank').withUsername('bank').withPassword('bank_password').start();
    connection = { host: container.getHost(), port: container.getPort(), username: container.getUsername(), password: container.getPassword(), database: container.getDatabase() };
  }

  const migrator = new DataSource(buildDataSourceOptions(connection));
  await migrator.initialize();
  await migrator.runMigrations();
  await migrator.destroy();
}
