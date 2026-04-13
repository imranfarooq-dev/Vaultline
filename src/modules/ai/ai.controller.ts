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

  @Post('ingest')
  @ApiOperation({ summary: 'Split, embed and store every markdown file in /knowledge' })
  ingest() {
    return this.ingestion.ingestDirectory();
  }

  @Post('retrieve')
  @ApiOperation({ summary: 'Only the retrieval step: see which chunks would be sent to the LLM' })
  retrieve(@Body() dto: AskDto) {
    return this.rag.retrieve(dto.question, dto.k);
  }

  @Post('ask')
  @ApiOperation({ summary: 'Full RAG answer with sources' })
  ask(@Body() dto: AskDto) {
    return this.rag.ask(dto.question, dto.k);
  }

  @Get('ask/stream')
  @ApiOperation({ summary: 'Streamed answer (Server-Sent Events). Try: curl -N "localhost:3000/api/ai/ask/stream?q=..."' })
  async stream(@Query('q') question: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
      for await (const token of this.rag.stream(question ?? '')) res.write(`data: ${JSON.stringify(token)}\n\n`);
      res.write('event: done\ndata: {}\n\n');
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify((error as Error).message)}\n\n`);
    }
    res.end();
  }
}
