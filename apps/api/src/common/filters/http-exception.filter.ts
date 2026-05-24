import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        const responseMessage = resp.message;
        message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : typeof responseMessage === 'string'
            ? responseMessage
            : message;
        code =
          typeof resp.code === 'string'
            ? resp.code
            : typeof resp.error === 'string'
              ? resp.error
              : code;
      }
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception,
      );
    }

    const details =
      exception instanceof HttpException &&
      typeof exception.getResponse() === 'object' &&
      exception.getResponse() !== null
        ? Object.fromEntries(
            Object.entries(
              exception.getResponse() as Record<string, unknown>,
            ).filter(
              ([key]) =>
                !['code', 'error', 'message', 'statusCode'].includes(key),
            ),
          )
        : {};

    response.status(status).json({
      error: {
        code,
        message,
        statusCode: status,
        ...details,
      },
    });
  }
}
