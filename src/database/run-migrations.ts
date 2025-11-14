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
}
