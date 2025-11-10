import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from './entities';
import { InitialSchema1726000000000 } from './migrations/1726000000000-InitialSchema';

export const MIGRATIONS = [InitialSchema1726000000000];

export interface DbConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

export const buildDataSourceOptions = ({ ssl, ...db }: DbConnectionOptions): DataSourceOptions => ({
  type: 'postgres',
  ...db,
  // RDS certificates are signed by Amazon's CA; for a learning project we accept them without bundling the CA file.
  ssl: ssl ? { rejectUnauthorized: false } : false,
  entities: ALL_ENTITIES,
  migrations: MIGRATIONS,
  synchronize: false,
});

/** Used by the migration runner script (and handy for the TypeORM CLI). */
export const dataSourceFromEnv = (): DataSource =>
  new DataSource(
    buildDataSourceOptions({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'bank',
      password: process.env.DB_PASSWORD ?? 'bank_password',
      database: process.env.DB_NAME ?? 'bank',
      ssl: process.env.DB_SSL === 'true',
    }),
  );
