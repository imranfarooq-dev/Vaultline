import * as Joi from 'joi';

/**
 * Fail fast: if the environment is misconfigured the app refuses to start
 * and tells you exactly which variable is wrong.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  APP_MODE: Joi.string().valid('api', 'worker').default('api'),
  PORT: Joi.number().port().default(3000),
  LOG_FORMAT: Joi.string().valid('pretty', 'json').default('pretty'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('bank'),
  DB_PASSWORD: Joi.string().default('bank_password'),
  DB_NAME: Joi.string().default('bank'),
  DB_RUN_MIGRATIONS: Joi.boolean().default(true),
  DB_SSL: Joi.boolean().default(false), // true on AWS RDS (TLS is enforced there)

  KAFKA_ENABLED: Joi.boolean().default(false),
  KAFKA_BROKERS: Joi.string().default('localhost:29092'),
  KAFKA_CLIENT_ID: Joi.string().default('banking-api'),
  KAFKA_CONSUMER_GROUP: Joi.string().default('banking-notifications'),
  KAFKA_REPLICATION_FACTOR: Joi.number().integer().min(1).default(1), // 2+ on AWS MSK
  KAFKA_SSL: Joi.boolean().default(false), // true on AWS MSK (TLS listener, port 9094)

  AI_PROVIDER: Joi.string().valid('ollama', 'fake').default('fake'),
  OLLAMA_BASE_URL: Joi.string().uri().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: Joi.string().default('llama3.2:1b'),
  OLLAMA_EMBEDDING_MODEL: Joi.string().default('nomic-embed-text'),
  AI_AUTO_INGEST: Joi.boolean().default(false),
  KNOWLEDGE_DIR: Joi.string().default('./knowledge'),

  INTERNAL_TRANSFER_FEE_MINOR: Joi.number().integer().min(0).default(0),
  FRAUD_RULES: Joi.string().allow('').default("amount > 5000000 AND channel == 'mobile';hour < 5 AND amount > 1000000"),
});
