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

  @Get('rules')
  @ApiOperation({ summary: 'Rules currently loaded from FRAUD_RULES' })
  rules() {
    return { rules: this.engine.activeRules };
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Parse and interpret any rule against a sample context' })
  evaluate(@Body() dto: EvaluateRuleDto) {
    try {
      return this.engine.tryRule(dto.rule, dto.context);
    } catch (error) {
      if (error instanceof RuleSyntaxError) throw new BusinessRuleError(error.message);
      throw error;
    }
  }
}
