import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../../database/entities';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountProductCatalog } from './domain/account-product.prototype';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  controllers: [AccountsController],
  providers: [AccountsService, AccountProductCatalog],
  exports: [AccountsService],
})
export class AccountsModule {}
