import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
import { BusinessRuleError } from '../../common/errors/domain.errors';
import { FraudRuleEngine } from './fraud-rule.engine';
import { RuleSyntaxError } from './fraud-rule.interpreter';

class EvaluateRuleDto {
  @ApiProperty({ example: "amount > 5000000 AND (channel == 'mobile' OR hour < 5)" })
  @IsString()
  rule: string;

  @ApiProperty({ example: { amount: 7000000, channel: 'mobile', hour: 14 } })
  @IsObject()
  context: Record<string, string | number | boolean>;
}

@ApiTags('Fraud (Interpreter)')
@Controller('fraud')
export class FraudController {
  constructor(private readonly engine: FraudRuleEngine) {}
}
