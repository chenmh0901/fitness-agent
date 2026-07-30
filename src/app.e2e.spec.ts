import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { configureApplication } from './common/http/configure-application';
import { AgentController } from './modules/agent/agent.controller';
import { AgentService } from './modules/agent/agent.service';
import { DailyFitnessController } from './modules/agent/daily-fitness/daily-fitness.controller';
import { DailyFitnessService } from './modules/agent/daily-fitness/daily-fitness.service';
import { WorkoutController } from './modules/workout/workout.controller';
import { WorkoutService } from './modules/workout/workout.service';

describe('Fitness Agent HTTP API (e2e)', () => {
  const getTodaySummary = jest.fn();
  const chat = jest.fn();
  const recordWorkout = jest.fn();
  const recordWorkoutFeedback = jest.fn();
  const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DailyFitnessController, AgentController, WorkoutController],
      providers: [
        {
          provide: DailyFitnessService,
          useValue: {
            getTodaySummary,
          },
        },
        {
          provide: AgentService,
          useValue: {
            chat,
          },
        },
        {
          provide: WorkoutService,
          useValue: {
            recordWorkout,
            recordWorkoutFeedback,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app, 'Asia/Shanghai', ['http://localhost:5173']);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    loggerError.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    getTodaySummary.mockReset();
    chat.mockReset();
    recordWorkout.mockReset();
    recordWorkoutFeedback.mockReset();
  });

  it('GET /api/daily/today returns the current daily summary', async () => {
    getTodaySummary.mockResolvedValue({
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

    await request(server)
      .get('/api/daily/today')
      .expect(200, {
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
    expect(getTodaySummary).toHaveBeenCalledTimes(1);
  });

  it('allows the configured Ionic Vite origin through CORS', async () => {
    await request(server)
      .options('/api/daily/today')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173')
      .expect(204);
  });

  it('POST /api/agent/chat trims the message and returns the AgentService answer', async () => {
    chat.mockResolvedValue('已记录今天的晨起体重为90.5kg。');

    await request(server)
      .post('/api/agent/chat')
      .send({ message: '  今天早上90.5kg  ' })
      .expect(200, {
        answer: '已记录今天的晨起体重为90.5kg。',
      });
    expect(chat).toHaveBeenCalledWith('今天早上90.5kg');
  });

  it('POST /api/agent/chat returns 400 for a blank message', async () => {
    const response = await request(server)
      .post('/api/agent/chat')
      .send({ message: '   ' })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.text).toContain('"code":"BAD_REQUEST"');
    expect(response.text).toContain('"message":"Request validation failed"');
    expect(response.text).toContain('message should not be empty');
    expect(chat).not.toHaveBeenCalled();
  });

  it('does not expose sensitive provider details when AgentService fails', async () => {
    chat.mockRejectedValue(
      new Error('OPENAI_API_KEY=secret-key provider stack at OpenAIAIProvider.chat'),
    );

    const response = await request(server)
      .post('/api/agent/chat')
      .send({ message: '分析今天状态' })
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.text).toContain('"code":"INTERNAL_SERVER_ERROR"');
    expect(response.text).toContain('"message":"The service is temporarily unavailable"');
    expect(response.text).not.toContain('secret-key');
    expect(response.text).not.toContain('OPENAI_API_KEY');
    expect(response.text).not.toContain('OpenAIAIProvider');
  });

  it('POST /api/workout/feedback validates and saves workout feedback', async () => {
    recordWorkoutFeedback.mockResolvedValue({
      id: 'exercise-record-id',
      workoutSessionId: 'session-id',
      date: new Date('2026-07-30T00:00:00.000Z'),
      category: 'strength',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: true,
      averageRpe: 9,
      lastWeight: 80,
      lastSets: 4,
      lastReps: 8,
      lastRpe: 9,
      progressTrend: 'insufficient_data',
    });

    await request(server)
      .post('/api/workout/feedback')
      .send({
        exerciseName: 'barbell bench press',
        weight: 80,
        sets: 4,
        reps: 8,
        rpe: 9,
        completed: true,
        date: '2026-07-30',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          exerciseName: 'barbell bench press',
          actualWeight: 80,
          rpe: 9,
          completed: true,
        });
      });
    expect(recordWorkoutFeedback).toHaveBeenCalledWith({
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: true,
      date: new Date('2026-07-30T00:00:00.000Z'),
    });
  });

  it.each([0, 11])('POST /api/workout/feedback rejects RPE %s', async (rpe) => {
    await request(server)
      .post('/api/workout/feedback')
      .send({
        exerciseName: 'barbell bench press',
        weight: 80,
        sets: 4,
        reps: 8,
        rpe,
        completed: true,
        date: '2026-07-30',
      })
      .expect(400);

    expect(recordWorkoutFeedback).not.toHaveBeenCalled();
  });
});
