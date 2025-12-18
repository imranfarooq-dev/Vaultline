import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { AccountType } from '../../../database/entities';

export class OpenAccountDto {
  @ApiProperty({ example: 'Ayesha Khan' })
  @IsString()
  @Length(2, 120)
  ownerName: string;

  @ApiProperty({ enum: AccountType, example: AccountType.SAVINGS })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({ example: 'PKR' })
  @IsString()
  @Length(3, 3)
  currency: string;
}
