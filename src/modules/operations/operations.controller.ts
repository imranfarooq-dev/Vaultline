import { Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundError } from '../../common/errors/domain.errors';
import { AccountEntity, LedgerEntryEntity } from '../../database/entities';
import { LedgerService } from '../transactions/ledger.service';
import { EndOfDayJob } from './end-of-day.template-method';
import { DormancyReviewJob, InterestPostingJob } from './jobs';

@ApiTags('Operations (Template Method)')
@Controller('operations')
export class OperationsController {
  private readonly jobs: Record<string, EndOfDayJob>;
}
