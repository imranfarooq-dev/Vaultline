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

  /** Auto-ingest in the background once Ollama has pulled the embedding model. */
  onApplicationBootstrap(): void {
    if (!this.config.ai.autoIngest) return;
    void this.autoIngestWithRetry();
  }

  async ingestDirectory(directory = this.config.ai.knowledgeDir) {
    const files = (await fs.readdir(directory)).filter((f) => f.endsWith('.md')).sort();

    const result = await this.store.withIngestionLock(async (manager) => {
      const summary: { source: string; chunks: number }[] = [];
      for (const file of files) {
        const text = await fs.readFile(path.join(directory, file), 'utf8');
        const documents = await this.splitter.createDocuments([text], [{ source: file }]);

        let vectors: number[][];
        try {
          vectors = await this.embeddings.embedDocuments(documents.map((d) => d.pageContent));
        } catch (error) {
          throw new DependencyUnavailableError(`Embedding model unavailable: ${(error as Error).message}. Is Ollama running and the model pulled?`);
        }

        await this.store.replaceSource(
          file,
          documents.map((doc, i) => ({ source: file, chunkIndex: i, content: doc.pageContent, metadata: doc.metadata, embedding: vectors[i] })),
          manager,
        );
        summary.push({ source: file, chunks: documents.length });
      }
      return summary;
    });

    if (result === null) return { skipped: true, reason: 'Another instance is ingesting right now' };
    this.logger.log(`Ingested ${result.reduce((s, r) => s + r.chunks, 0)} chunks from ${result.length} file(s)`);
    return { skipped: false, files: result };
  }
}
