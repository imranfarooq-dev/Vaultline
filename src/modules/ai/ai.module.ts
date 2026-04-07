import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { llmProviders } from './llm/llm.providers';
import { KnowledgeIngestionService } from './rag/knowledge-ingestion.service';
import { PgVectorStore } from './rag/pgvector.store';
import { RagService } from './rag/rag.service';

@Module({
  controllers: [AiController],
  providers: [...llmProviders, PgVectorStore, KnowledgeIngestionService, RagService],
  exports: [RagService],
})
export class AiModule {}
