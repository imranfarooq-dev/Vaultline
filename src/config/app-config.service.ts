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

  get kafka() {
    return {
      enabled: this.bool('KAFKA_ENABLED'),
      brokers: this.config.getOrThrow<string>('KAFKA_BROKERS').split(',').map((b) => b.trim()),
      clientId: this.config.getOrThrow<string>('KAFKA_CLIENT_ID'),
      consumerGroup: this.config.getOrThrow<string>('KAFKA_CONSUMER_GROUP'),
      ssl: this.bool('KAFKA_SSL'),
      replicationFactor: Number(this.config.getOrThrow('KAFKA_REPLICATION_FACTOR')),
    };
  }

  get ai() {
    return {
      provider: this.config.getOrThrow<'ollama' | 'fake'>('AI_PROVIDER'),
      baseUrl: this.config.getOrThrow<string>('OLLAMA_BASE_URL'),
      chatModel: this.config.getOrThrow<string>('OLLAMA_CHAT_MODEL'),
      embeddingModel: this.config.getOrThrow<string>('OLLAMA_EMBEDDING_MODEL'),
      autoIngest: this.bool('AI_AUTO_INGEST'),
      knowledgeDir: this.config.getOrThrow<string>('KNOWLEDGE_DIR'),
    };
  }

  get internalTransferFeeMinor(): number {
    return Number(this.config.getOrThrow('INTERNAL_TRANSFER_FEE_MINOR'));
  }
}
