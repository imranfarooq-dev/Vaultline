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
