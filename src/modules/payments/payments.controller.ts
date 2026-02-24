import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, Length } from 'class-validator';
import { ReferenceNumberGenerator } from '../core/reference-number.singleton';
import { quotePayment, railFactoryFor } from './payment-rail.abstract-factory';

class PaymentQuoteDto {
  @ApiProperty({ enum: ['RAAST', 'SWIFT'] }) @IsIn(['RAAST', 'SWIFT']) rail: 'RAAST' | 'SWIFT';
  @ApiProperty({ example: 5000000 }) @IsInt() @IsPositive() amountMinor: number;
  @ApiProperty({ example: 'PKR' }) @IsString() @Length(3, 3) currency: string;
  @ApiProperty({ example: 'Bilal Ahmed' }) @IsString() beneficiaryName: string;
  @ApiProperty({ example: 'PK36SCBL0000001123456702' }) @IsString() beneficiaryIban: string;
  @ApiPropertyOptional({ example: 'DEUTDEFF' }) @IsOptional() @IsString() beneficiaryBic?: string;
  @ApiPropertyOptional({ example: 'Family support' }) @IsOptional() @IsString() purpose?: string;
}

@ApiTags('Payments (Abstract Factory, Singleton)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly references: ReferenceNumberGenerator) {}

  @Post('quote')
  @ApiOperation({ summary: 'Validate, price and format an outbound payment with a matching family of objects' })
  quote(@Body() dto: PaymentQuoteDto) {
    const { rail, ...payment } = dto;
    return quotePayment(railFactoryFor(rail), payment, this.references.next('PAY'));
  }
}
