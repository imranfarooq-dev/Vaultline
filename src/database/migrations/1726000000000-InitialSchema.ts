import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema is managed by migrations (never `synchronize: true` in real systems).
 * The `vector` extension comes from the pgvector/pgvector Postgres image and
 * powers the RAG similarity search.
 */
export class InitialSchema1726000000000 implements MigrationInterface {
  name = 'InitialSchema1726000000000';
}
