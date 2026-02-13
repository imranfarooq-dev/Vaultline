import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { Expression, FraudRuleParser, RuleContext } from './fraud-rule.interpreter';

export interface FraudVerdict {
  suspicious: boolean;
  matchedRules: string[];
}
