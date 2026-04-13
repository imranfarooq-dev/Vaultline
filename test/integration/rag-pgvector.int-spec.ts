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
});
