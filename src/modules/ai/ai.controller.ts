import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { KnowledgeIngestionService } from './rag/knowledge-ingestion.service';
import { PgVectorStore } from './rag/pgvector.store';
import { RagService } from './rag/rag.service';

class AskDto {
  @ApiProperty({ example: 'What is the fee for an international SWIFT transfer?' })
  @IsString()
  @Length(3, 500)
  question: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  k?: number;
}

@ApiTags('AI assistant (Ollama + LangChain + pgvector RAG)')
@Controller('ai')
export class AiController {
  constructor(
    private readonly rag: RagService,
    private readonly ingestion: KnowledgeIngestionService,
    private readonly store: PgVectorStore,
    private readonly config: AppConfigService,
  ) {}

  @Get('status')
  async status() {
    const { provider, chatModel, embeddingModel, baseUrl } = this.config.ai;
    return { provider, chatModel, embeddingModel, ollama: baseUrl, knowledge: await this.store.stats() };
  }
}
