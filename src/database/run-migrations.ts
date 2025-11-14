import { Logger } from '@nestjs/common';
import { dataSourceFromEnv } from './data-source';

/**
 * Runs pending migrations and exits.
 * Docker Compose runs this as the `migrate` service; Kubernetes runs it as a Job.
 * Running migrations ONCE, before the API starts, avoids races between replicas.
 */
async function run(): Promise<void> {
  const logger = new Logger('Migrations');
  const dataSource = dataSourceFromEnv();

  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await dataSource.initialize();
      break;
    } catch (error) {
      const message = (error as Error).message;
      const transient = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|timeout|starting up|terminating|does not exist/i.test(message);
      if (!transient) throw error;
      logger.warn(`Database not ready (attempt ${attempt}/30): ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!dataSource.isInitialized) throw new Error('Could not connect to the database');

  const applied = await dataSource.runMigrations({ transaction: 'each' });
  logger.log(applied.length ? `Applied: ${applied.map((m) => m.name).join(', ')}` : 'Database already up to date');
  await dataSource.destroy();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
