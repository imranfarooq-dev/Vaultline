import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { KnowledgeIngestionService } from '../rag/knowledge-ingestion.service';

/** CLI: `npm run seed:knowledge` or `kubectl exec ... -- node dist/modules/ai/scripts/ingest-knowledge.js` */
async function main() {
  process.env.AI_AUTO_INGEST = 'false';
  process.env.KAFKA_ENABLED = 'false';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  console.log(JSON.stringify(await app.get(KnowledgeIngestionService).ingestDirectory(), null, 2));
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
