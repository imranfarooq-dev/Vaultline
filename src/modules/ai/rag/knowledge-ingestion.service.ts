import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Embeddings } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { AppConfigService } from '../../../config/app-config.service';
import { DependencyUnavailableError } from '../../../common/errors/domain.errors';
import { EMBEDDINGS } from '../llm/ai.tokens';
import { PgVectorStore } from './pgvector.store';

/**
 * RAG step 1 - INDEXING (done ahead of time):
 *   read documents -> split into overlapping chunks -> embed each chunk -> store vectors
 */
@Injectable()
export class KnowledgeIngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeIngestionService.name);
  private readonly splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', { chunkSize: 900, chunkOverlap: 120 });

  constructor(
    @Inject(EMBEDDINGS) private readonly embeddings: Embeddings,
    private readonly store: PgVectorStore,
    private readonly config: AppConfigService,
  ) {}
}
