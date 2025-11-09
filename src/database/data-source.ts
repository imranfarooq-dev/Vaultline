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
