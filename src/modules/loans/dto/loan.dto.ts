import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator';

/** Every field optional: a draft is filled in over several steps. */
export class LoanDraftDto {
  @ApiPropertyOptional({ example: 'Ali Raza' }) @IsOptional() @IsString() applicantName?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() accountId?: string;
  @ApiPropertyOptional({ example: 50000000 }) @IsOptional() @IsInt() @IsPositive() amountMinor?: number;
  @ApiPropertyOptional({ example: 24 }) @IsOptional() @IsInt() @Min(3) @Max(84) termMonths?: number;
  @ApiPropertyOptional({ example: 'car' }) @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional({ example: 25000000 }) @IsOptional() @IsInt() @IsPositive() monthlyIncomeMinor?: number;
  @ApiPropertyOptional({ example: 'Toyota Corolla 2022' }) @IsOptional() @IsString() collateralDescription?: string;
  @ApiPropertyOptional({ example: 600000000 }) @IsOptional() @IsInt() @IsPositive() collateralValueMinor?: number;
}
