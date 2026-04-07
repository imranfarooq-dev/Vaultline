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
}
