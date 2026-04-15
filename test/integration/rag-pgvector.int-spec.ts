import { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'node:path';
import { startTestDatabase, TestDatabase } from '../support/postgres';

/**
 * INTEGRATION: RAG storage and retrieval against real pgvector.
 * Uses deterministic hashing embeddings so results are repeatable
 * without downloading an Ollama model.
 */
describe('RAG with pgvector (integration)', () => {
  let db: TestDatabase;
  let app: INestApplicationContext;
  let ingestion: import('../../src/modules/ai/rag/knowledge-ingestion.service').KnowledgeIngestionService;
  let store: import('../../src/modules/ai/rag/pgvector.store').PgVectorStore;
  let rag: import('../../src/modules/ai/rag/rag.service').RagService;

  beforeAll(async () => {
    db = await startTestDatabase();
    db.applyToEnv();
    Object.assign(process.env, { KAFKA_ENABLED: 'false', AI_PROVIDER: 'fake', AI_AUTO_INGEST: 'false', KNOWLEDGE_DIR: join(__dirname, '..', '..', 'knowledge') });

    const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
    app = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await app.init();
    ingestion = app.get((require('../../src/modules/ai/rag/knowledge-ingestion.service') as typeof import('../../src/modules/ai/rag/knowledge-ingestion.service')).KnowledgeIngestionService);
    store = app.get((require('../../src/modules/ai/rag/pgvector.store') as typeof import('../../src/modules/ai/rag/pgvector.store')).PgVectorStore);
    rag = app.get((require('../../src/modules/ai/rag/rag.service') as typeof import('../../src/modules/ai/rag/rag.service')).RagService);
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('ingests every knowledge file into chunks', async () => {
    const result = await ingestion.ingestDirectory();
    expect(result.skipped).toBe(false);
    const stats = await store.stats();
    expect(stats.sources).toHaveLength(5);
    expect(stats.chunks).toBeGreaterThanOrEqual(5);
  });

  it('re-ingesting replaces chunks instead of duplicating them', async () => {
    const before = (await store.stats()).chunks;
    await ingestion.ingestDirectory();
    expect((await store.stats()).chunks).toBe(before);
  });

  it('similarity search finds the right document', async () => {
    const hits = await rag.retrieve('What documents do I need for a loan and what credit score is required?', 3);
    expect(hits[0].source).toBe('04-loans.md');
    expect(hits[0].score).toBeGreaterThan(hits[hits.length - 1].score - 0.0001);
  });

  it('answers with sources through the full chain', async () => {
    const answer = await rag.ask('Can a frozen account receive salary deposits?');
    expect(answer.sources.map((s) => s.source)).toContain('05-security-and-fraud.md');
  });
});
