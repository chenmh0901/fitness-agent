import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  configureApplication,
  DEFAULT_APPLICATION_TIME_ZONE,
  DEFAULT_CORS_ORIGINS,
  parseCorsOrigins,
} from './common/http/configure-application';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const timeZone = configService.get<string>('APP_TIMEZONE', DEFAULT_APPLICATION_TIME_ZONE);
  const corsOrigins = parseCorsOrigins(
    configService.get<string>('APP_CORS_ORIGINS', DEFAULT_CORS_ORIGINS.join(',')),
  );

  configureApplication(app, timeZone, corsOrigins);

  await app.listen(port);
}

void bootstrap();
