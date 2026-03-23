import { Module } from '@nestjs/common';
import { PatternsController } from './patterns.controller';

@Module({ controllers: [PatternsController] })
export class PatternsModule {}
