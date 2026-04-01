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
