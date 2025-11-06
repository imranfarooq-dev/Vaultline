import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../errors/domain.errors';

/** Converts every error into one consistent JSON shape. */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      response.status(exception.httpStatus).json({
        error: exception.code,
        message: exception.message,
        details: exception.details,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      response.status(exception.getStatus()).json({
        error: 'HTTP_ERROR',
        message: typeof body === 'string' ? body : (body as { message?: unknown }).message,
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
  }
}
