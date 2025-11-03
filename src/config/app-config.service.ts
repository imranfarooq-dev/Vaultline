import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed access to configuration.
 *
 * NestJS providers are singletons by default (one instance per app), so this
 * service is effectively a SINGLETON managed by the DI container. Compare it
 * with the "classic" hand-written singleton in
 * src/modules/core/reference-number.singleton.ts.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string { return this.config.getOrThrow('NODE_ENV'); }
  get appMode(): 'api' | 'worker' { return this.config.getOrThrow('APP_MODE'); }
  get port(): number { return Number(this.config.getOrThrow('PORT')); }
  get logFormat(): 'pretty' | 'json' { return this.config.getOrThrow('LOG_FORMAT'); }

  get database() {
    return {
      host: this.config.getOrThrow<string>('DB_HOST'),
      port: Number(this.config.getOrThrow('DB_PORT')),
      username: this.config.getOrThrow<string>('DB_USER'),
      password: this.config.getOrThrow<string>('DB_PASSWORD'),
      database: this.config.getOrThrow<string>('DB_NAME'),
      runMigrations: this.bool('DB_RUN_MIGRATIONS'),
      ssl: this.bool('DB_SSL'),
    };
  }
}
