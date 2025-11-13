import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../../common/utils/bigint.transformer';

export enum LoanStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

@Entity('loan_applications')
export class LoanApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applicant_name', length: 120 })
  applicantName: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;
}
