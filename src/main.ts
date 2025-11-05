import 'reflect-metadata';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.setup';
import { AppModule } from './app.module';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const mode = process.env.APP_MODE === 'worker' ? 'worker' : 'api';
  const logger = new ConsoleLogger({ json: process.env.LOG_FORMAT === 'json', prefix: mode === 'api' ? 'BankAPI' : 'BankWorker' });

  const app = await NestFactory.create(mode === 'api' ? AppModule : WorkerModule, { logger });

  if (mode === 'api') {
    configureApp(app);
  } else {
    app.setGlobalPrefix('api'); // the worker only exposes /api/health for Kubernetes probes
    app.enableShutdownHooks();
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(mode === 'api' ? `API ready on http://localhost:${port}/api  |  Swagger: http://localhost:${port}/docs` : `Worker running (health on :${port})`, 'Bootstrap');
}

void bootstrap();
