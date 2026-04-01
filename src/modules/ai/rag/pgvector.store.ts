import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

export interface KnowledgeChunk {
  source: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

export interface ScoredChunk {
  source: string;
  chunkIndex: number;
  content: string;
  /** Cosine similarity: 1 = identical direction, 0 = unrelated. */
  score: number;
}

/** pgvector expects the literal format '[0.1,0.2,...]'. */
const toVectorLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;

/**
 * A tiny vector store on top of PostgreSQL + pgvector.
 * Written by hand (instead of a library wrapper) so every SQL step is visible:
 *   `<=>` is pgvector's cosine DISTANCE operator; similarity = 1 - distance.
 *   The HNSW index created in the migration makes this fast on large tables.
 */
@Injectable()
export class PgVectorStore {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async replaceSource(source: string, chunks: KnowledgeChunk[], manager: EntityManager = this.dataSource.manager): Promise<void> {
    await manager.transaction(async (tx) => {
      await tx.query('DELETE FROM knowledge_chunks WHERE source = $1', [source]);
      for (const chunk of chunks) {
        await tx.query(
          'INSERT INTO knowledge_chunks (source, chunk_index, content, metadata, embedding) VALUES ($1, $2, $3, $4, $5::vector)',
          [chunk.source, chunk.chunkIndex, chunk.content, JSON.stringify(chunk.metadata), toVectorLiteral(chunk.embedding)],
        );
      }
    });
  }
}
