import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { configureApplication } from './common/http/configure-application';
import { AgentController } from './modules/agent/agent.controller';
import { AgentService } from './modules/agent/agent.service';
import { DailyFitnessController } from './modules/agent/daily-fitness/daily-fitness.controller';
import { DailyFitnessService } from './modules/agent/daily-fitness/daily-fitness.service';
import { DailyStatusController } from './modules/daily-status/daily-status.controller';
import { DailyStatusService } from './modules/daily-status/daily-status.service';
import { FitnessGoalController } from './modules/fitness-goal/fitness-goal.controller';
import { FitnessGoalService } from './modules/fitness-goal/fitness-goal.service';
import { NutritionController } from './modules/nutrition/nutrition.controller';
import { NutritionService } from './modules/nutrition/nutrition.service';
import { TrainingPlanVersionController } from './modules/coach-plan-version/training-plan-version.controller';
import { TrainingPlanVersionService } from './modules/coach-plan-version/training-plan-version.service';
import { WorkoutController } from './modules/workout/workout.controller';
import { WorkoutService } from './modules/workout/workout.service';

describe('Fitness Agent HTTP API (e2e)', () => {
  const getTodaySummary = jest.fn();
  const chat = jest.fn();
  const recordWorkout = jest.fn();
  const recordWorkoutFeedback = jest.fn();
  const createGoal = jest.fn();
  const getActiveGoal = jest.fn();
  const createNutrition = jest.fn();
  const createDailyStatus = jest.fn();
  const getCurrentPlanVersion = jest.fn();
  const getPlanVersionHistory = jest.fn();
  const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        DailyFitnessController,
        AgentController,
        WorkoutController,
        FitnessGoalController,
        NutritionController,
        DailyStatusController,
        TrainingPlanVersionController,
      ],
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
        {
          provide: FitnessGoalService,
          useValue: {
            createGoal,
            getActiveGoal,
          },
        },
        {
          provide: NutritionService,
          useValue: {
            createRecord: createNutrition,
          },
        },
        {
          provide: DailyStatusService,
          useValue: {
            createStatus: createDailyStatus,
          },
        },
        {
          provide: TrainingPlanVersionService,
          useValue: {
            getActiveVersion: getCurrentPlanVersion,
            getVersionHistory: getPlanVersionHistory,
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
    createGoal.mockReset();
    getActiveGoal.mockReset();
    createNutrition.mockReset();
    createDailyStatus.mockReset();
    getCurrentPlanVersion.mockReset();
    getPlanVersionHistory.mockReset();
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

  it('POST /api/goals creates a long-term fitness goal', async () => {
    createGoal.mockResolvedValue({ id: 'goal-id', status: 'ACTIVE' });

    await request(server)
      .post('/api/goals')
      .send({
        type: 'FAT_LOSS',
        startWeight: 91.7,
        targetWeight: 85,
        targetBodyFat: 16,
        startDate: '2026-08-01',
        targetDate: '2026-09-26',
        durationWeeks: 8,
        priority: 'KEEP_STRENGTH',
      })
      .expect(201, {
        id: 'goal-id',
        status: 'ACTIVE',
      });
    expect(createGoal).toHaveBeenCalledWith({
      type: 'FAT_LOSS',
      startWeight: 91.7,
      targetWeight: 85,
      targetBodyFat: 16,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      targetDate: new Date('2026-09-26T00:00:00.000Z'),
      durationWeeks: 8,
      priority: 'KEEP_STRENGTH',
    });
  });

  it('GET /api/goals/active returns the active goal', async () => {
    getActiveGoal.mockResolvedValue({ id: 'goal-id', status: 'ACTIVE' });

    await request(server).get('/api/goals/active').expect(200, {
      id: 'goal-id',
      status: 'ACTIVE',
    });
    expect(getActiveGoal).toHaveBeenCalledTimes(1);
  });

  it('POST /api/nutrition records daily macros', async () => {
    createNutrition.mockResolvedValue({ id: 'nutrition-id' });

    await request(server)
      .post('/api/nutrition')
      .send({
        calories: 2200,
        protein: 160,
        carbs: 250,
        fat: 60,
        date: '2026-08-01',
      })
      .expect(201, {
        id: 'nutrition-id',
      });
    expect(createNutrition).toHaveBeenCalledWith({
      calories: 2200,
      protein: 160,
      carbs: 250,
      fat: 60,
      date: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('POST /api/status records subjective daily status', async () => {
    createDailyStatus.mockResolvedValue({ id: 'status-id' });

    await request(server)
      .post('/api/status')
      .send({
        energyLevel: 7,
        fatigueLevel: 3,
        muscleSoreness: 2,
        stressLevel: 4,
        date: '2026-08-01',
      })
      .expect(201, {
        id: 'status-id',
      });
    expect(createDailyStatus).toHaveBeenCalledWith({
      energyLevel: 7,
      fatigueLevel: 3,
      muscleSoreness: 2,
      stressLevel: 4,
      date: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('GET /api/training-plan/current returns the active plan version', async () => {
    getCurrentPlanVersion.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      status: 'ACTIVE',
      workoutPlans: [],
    });

    await request(server).get('/api/training-plan/current').expect(200, {
      id: 'version-2',
      versionNumber: 2,
      status: 'ACTIVE',
      workoutPlans: [],
    });
    expect(getCurrentPlanVersion).toHaveBeenCalledTimes(1);
  });

  it('GET /api/training-plan/history returns all plan versions', async () => {
    getPlanVersionHistory.mockResolvedValue([
      { id: 'version-2', versionNumber: 2, status: 'ACTIVE' },
      { id: 'version-1', versionNumber: 1, status: 'ARCHIVED' },
    ]);

    await request(server).get('/api/training-plan/history').expect(200, [
      { id: 'version-2', versionNumber: 2, status: 'ACTIVE' },
      { id: 'version-1', versionNumber: 1, status: 'ARCHIVED' },
    ]);
    expect(getPlanVersionHistory).toHaveBeenCalledTimes(1);
  });
});
