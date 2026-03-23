import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PATTERN_CATALOG } from './patterns.catalog';

@ApiTags('Start here: pattern catalog')
@Controller('patterns')
export class PatternsController {
  @Get()
  @ApiOperation({ summary: 'All 23 GoF patterns with file location and an endpoint to try' })
  list() {
    return { total: PATTERN_CATALOG.length, patterns: PATTERN_CATALOG };
  }
}
