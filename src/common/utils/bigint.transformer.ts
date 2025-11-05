import { ValueTransformer } from 'typeorm';

/** Postgres BIGINT comes back as a string; convert it to a JS number for convenience. */
export const bigintTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
