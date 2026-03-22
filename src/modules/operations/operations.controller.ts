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

  constructor(
    @InjectRepository(AccountEntity) accounts: Repository<AccountEntity>,
    @InjectRepository(LedgerEntryEntity) entries: Repository<LedgerEntryEntity>,
    ledger: LedgerService,
  ) {
    const all = [new InterestPostingJob(accounts, ledger), new DormancyReviewJob(accounts, entries)];
    this.jobs = Object.fromEntries(all.map((job) => [job.name, job]));
  }

  @Post('jobs/:name/run')
  @ApiParam({ name: 'name', enum: ['interest-posting', 'dormancy-review'] })
  @ApiOperation({ summary: 'Run a batch job. Both share one skeleton: EndOfDayJob.run()' })
  run(@Param('name') name: string) {
    const job = this.jobs[name];
    if (!job) throw new NotFoundError(`Unknown job ${name}`, { available: Object.keys(this.jobs) });
    return job.run();
  }
}
