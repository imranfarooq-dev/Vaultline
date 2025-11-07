import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import { buildDataSourceOptions } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { runMigrations, ...connection } = config.database;
        return {
          ...buildDataSourceOptions(connection),
          migrationsRun: runMigrations,
          retryAttempts: 10,
          retryDelay: 3000,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
