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
}
