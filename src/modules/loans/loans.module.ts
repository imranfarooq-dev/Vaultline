import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanApplicationEntity } from '../../database/entities';
import { AccountsModule } from '../accounts/accounts.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplicationEntity]), AccountsModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
