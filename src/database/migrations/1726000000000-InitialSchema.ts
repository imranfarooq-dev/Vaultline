import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema is managed by migrations (never `synchronize: true` in real systems).
 * The `vector` extension comes from the pgvector/pgvector Postgres image and
 * powers the RAG similarity search.
 */
export class InitialSchema1726000000000 implements MigrationInterface {
  name = 'InitialSchema1726000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    await q.query(`
      CREATE TABLE accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_number varchar(24) NOT NULL UNIQUE,
        owner_name varchar(120) NOT NULL,
        type varchar(20) NOT NULL,
        currency varchar(3) NOT NULL,
        product_code varchar(40),
        balance_minor bigint NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
        daily_withdrawal_limit_minor bigint NOT NULL,
        annual_interest_rate numeric(5,2) NOT NULL DEFAULT 0,
        status varchar(12) NOT NULL,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_accounts_owner ON accounts (owner_name)`);

    await q.query(`
      CREATE TABLE ledger_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES accounts(id),
        type varchar(20) NOT NULL,
        amount_minor bigint NOT NULL,
        balance_after_minor bigint NOT NULL,
        reference varchar(40) NOT NULL,
        description varchar(255) NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_ledger_account_time ON ledger_entries (account_id, created_at, id)`);
    await q.query(`CREATE INDEX idx_ledger_reference ON ledger_entries (reference)`);

    await q.query(`
      CREATE TABLE loan_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_name varchar(120) NOT NULL,
        account_id uuid NOT NULL REFERENCES accounts(id),
        amount_minor bigint NOT NULL,
        term_months integer NOT NULL,
        purpose varchar(80) NOT NULL,
        monthly_income_minor bigint NOT NULL,
        status varchar(16) NOT NULL,
        decision_log jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE notifications (
        event_id uuid PRIMARY KEY,
        event_type varchar(60) NOT NULL,
        message varchar(255) NOT NULL,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    // 768 = output size of the nomic-embed-text embedding model.
    await q.query(`
      CREATE TABLE knowledge_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source varchar(200) NOT NULL,
        chunk_index integer NOT NULL,
        content text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        embedding vector(768) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_knowledge_source ON knowledge_chunks (source)`);
    await q.query(`CREATE INDEX idx_knowledge_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS knowledge_chunks`);
    await q.query(`DROP TABLE IF EXISTS notifications`);
    await q.query(`DROP TABLE IF EXISTS loan_applications`);
    await q.query(`DROP TABLE IF EXISTS ledger_entries`);
    await q.query(`DROP TABLE IF EXISTS accounts`);
  }
}
