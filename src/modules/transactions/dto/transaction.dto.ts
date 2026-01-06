import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class MoneyMovementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId: string;
}
