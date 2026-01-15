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
