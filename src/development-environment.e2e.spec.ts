import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { environmentValidationSchema } from './common/config/environment.validation';
import { configureApplication } from './common/http/configure-application';
import { DailyFitnessController } from './modules/agent/daily-fitness/daily-fitness.controller';
import { DailyFitnessService } from './modules/agent/daily-fitness/daily-fitness.service';
import { OpenAIAIProvider } from './modules/agent/provider/openai/openai-ai.provider';
import { ToolRegistryService } from './modules/agent/tools/tool-registry.service';

describe('Development environment without OpenAI configuration (e2e)', () => {
  const originalEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL =
      'postgresql://fitness:fitness@localhost:5432/fitness_agent?schema=public';
    process.env.OPENAI_API_KEY = '';
    process.env.OPENAI_MODEL = 'test-model';

    const getTodaySummary = jest.fn().mockResolvedValue({
      localDate: '2026-07-30',
      generatedAt: '2026-07-30T04:00:00.000Z',
      weightSummary: {
        days: 7,
        recordCount: 0,
        averageWeight: null,
        firstWeight: null,
        latestWeight: null,
        minWeight: null,
        maxWeight: null,
        weightRange: null,
        volatility: null,
        weeklyAverageChange: null,
        change: null,
        trend: 'insufficient_data',
      },
      sleepSummary: {
        days: 7,
        recordCount: 0,
        recentSleep: [],
        averageDurationMinutes: null,
        averageQuality: null,
        status: 'no_data',
      },
      todayWorkout: null,
      recommendationsContext: {
        userProfile: null,
        recentExercisePerformance: [],
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validationSchema: environmentValidationSchema,
        }),
      ],
      controllers: [DailyFitnessController],
      providers: [
        OpenAIAIProvider,
        {
          provide: ToolRegistryService,
          useValue: {
            getDefinitions: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: DailyFitnessService,
          useValue: {
            getTodaySummary,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app, 'Asia/Shanghai', ['http://localhost:5173']);
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('keeps GET /api/daily/today available', async () => {
    const server = app.getHttpServer() as Server;

    await request(server)
      .get('/api/daily/today')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            localDate: '2026-07-30',
            todayWorkout: null,
          }),
        );
      });
  });
});
