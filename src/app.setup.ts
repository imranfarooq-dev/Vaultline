import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

/** Shared by main.ts and the e2e tests so both run the exact same HTTP setup. */
export const configureApp = (app: INestApplication, withSwagger = true): INestApplication => {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableShutdownHooks();
};
