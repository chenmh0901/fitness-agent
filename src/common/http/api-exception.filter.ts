import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiErrorResponseDto } from './api-error-response.dto';

interface NestHttpErrorBody {
  readonly message?: string | string[];
}

interface HttpRequest {
  readonly originalUrl: string;
}

interface HttpResponse {
  status(statusCode: number): HttpResponse;
  json(body: ApiErrorResponseDto): void;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const errorResponse = this.buildErrorResponse(exception, request.originalUrl);

    if (errorResponse.statusCode >= 500) {
      this.logger.error('Unhandled HTTP request failure',
        exception instanceof Error
          ? exception.stack
          : String(exception),);
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, path: string): ApiErrorResponseDto {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'The service is temporarily unavailable',
        timestamp: new Date().toISOString(),
        path,
      };
    }

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const body =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as NestHttpErrorBody)
        : undefined;
    const details = Array.isArray(body?.message) ? body.message : undefined;
    const message =
      details === undefined
        ? this.getHttpExceptionMessage(exceptionResponse, exception)
        : 'Request validation failed';

    return {
      statusCode,
      code: HttpStatus[statusCode] ?? 'HTTP_ERROR',
      message,
      ...(details === undefined ? {} : { details }),
      timestamp: new Date().toISOString(),
      path,
    };
  }

  private getHttpExceptionMessage(response: string | object, exception: HttpException): string {
    if (typeof response === 'string') {
      return response;
    }

    const body = response as NestHttpErrorBody;

    return typeof body.message === 'string' ? body.message : exception.message;
  }
}
