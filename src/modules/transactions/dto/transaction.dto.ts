import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class MoneyMovementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId: string;

  @ApiProperty({ example: 250000, description: 'Minor units. 250000 = Rs 2,500.00' })
  @IsInt()
  @IsPositive()
  amountMinor: number;

  @ApiPropertyOptional({ example: 'Salary' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class TransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromAccountId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAccountId: string;
}
