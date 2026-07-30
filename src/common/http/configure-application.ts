import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

export const API_GLOBAL_PREFIX = 'api';
export const DEFAULT_APPLICATION_TIME_ZONE = 'Asia/Shanghai';
export const DEFAULT_CORS_ORIGINS = ['http://localhost:5173'] as const;

export function parseCorsOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new TypeError('APP_CORS_ORIGINS must contain at least one origin');
  }

  return origins.map((origin) => {
    if (origin === '*') {
      throw new TypeError('APP_CORS_ORIGINS must not contain a wildcard origin');
    }

    const url = new URL(origin);

    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new TypeError(`Invalid CORS origin: ${origin}`);
    }

    return url.origin;
  });
}

export function configureApplication(
  app: INestApplication,
  timeZone = DEFAULT_APPLICATION_TIME_ZONE,
  corsOrigins: readonly string[] = DEFAULT_CORS_ORIGINS,
): void {
  process.env.TZ = timeZone;
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableCors({
    origin: [...corsOrigins],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
