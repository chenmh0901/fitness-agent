import { Injectable } from '@nestjs/common';
import {
  DayOfWeek,
  TrainingCycle,
  TrainingCycleStatus,
  TrainingPlanVersionStatus,
} from '../../generated/prisma/client';
import {
  assertPositiveInteger,
  startOfLocalDay,
  startOfRecentDayWindow,
} from '../../common/utils/date.util';
import { roundTo } from '../../common/utils/number.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkoutFeedbackDto } from './dto/create-workout-feedback.dto';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { ExercisePerformanceDto, ExerciseProgressTrend } from './dto/exercise-performance.dto';
import { TodayWorkoutDto } from './dto/today-workout.dto';
import { TrainingAdherenceDto } from './dto/training-adherence.dto';
import { TrainingCycleDto } from './dto/training-cycle.dto';

const RECENT_EXERCISE_RECORD_LIMIT = 50;
const RECORDED_WORKOUT_CATEGORY = 'strength';
const DAY_OF_WEEK_BY_JAVASCRIPT_DAY = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
] as const;

interface WorkoutRecordInput {
  exerciseName: string;
  weight: number;
  sets: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
  date: Date;
}

interface ComparableExerciseRecord {
  actualWeight: {
    toNumber(): number;
  } | null;
  completed: boolean;
}

@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}

  async recordWorkout(input: CreateWorkoutRecordDto): Promise<ExercisePerformanceDto> {
    return this.saveWorkoutRecord({
      ...input,
      rpe: null,
      completed: true,
    });
  }

  async recordWorkoutFeedback(input: CreateWorkoutFeedbackDto): Promise<ExercisePerformanceDto> {
    return this.saveWorkoutRecord(input);
  }

  private async saveWorkoutRecord(input: WorkoutRecordInput): Promise<ExercisePerformanceDto> {
    const userProfile = await this.prisma.userProfile.findFirst({
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!userProfile) {
      throw new Error('User profile is not configured');
    }

    return this.prisma.$transaction(async (transaction) => {
      const workoutSession = await transaction.workoutSession.create({
        data: {
          userProfileId: userProfile.id,
          date: input.date,
          category: RECORDED_WORKOUT_CATEGORY,
        },
      });
      const exerciseRecord = await transaction.workoutExerciseRecord.create({
        data: {
          workoutSessionId: workoutSession.id,
          exerciseName: input.exerciseName,
          actualWeight: input.weight,
          sets: input.sets,
          reps: input.reps,
          rpe: input.rpe,
          completed: input.completed,
        },
      });

      const actualWeight = exerciseRecord.actualWeight?.toNumber() ?? null;
      const rpe = exerciseRecord.rpe?.toNumber() ?? null;

      return {
        id: exerciseRecord.id,
        workoutSessionId: workoutSession.id,
        date: workoutSession.date,
        category: workoutSession.category,
        exerciseName: exerciseRecord.exerciseName,
        actualWeight,
        sets: exerciseRecord.sets,
        reps: exerciseRecord.reps,
        rpe,
        completed: exerciseRecord.completed,
        averageRpe: rpe,
        lastWeight: actualWeight,
        lastSets: exerciseRecord.sets,
        lastReps: exerciseRecord.reps,
        lastRpe: rpe,
        progressTrend: ExerciseProgressTrend.INSUFFICIENT_DATA,
      };
    });
  }

  async getTodayWorkout(): Promise<TodayWorkoutDto | null> {
    const today = startOfLocalDay();
    const trainingCycle = await this.findCurrentTrainingCycle(today);

    if (!trainingCycle) {
      return null;
    }

    const dayOfWeek = DAY_OF_WEEK_BY_JAVASCRIPT_DAY[today.getDay()];
    const exercises = await this.prisma.workoutPlan.findMany({
      where: {
        trainingPlanVersion: {
          trainingCycleId: trainingCycle.id,
          status: TrainingPlanVersionStatus.ACTIVE,
        },
        dayOfWeek,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return {
      date: today,
      dayOfWeek,
      trainingCycle: this.toTrainingCycleDto(trainingCycle),
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        category: exercise.category,
        exerciseName: exercise.exerciseName,
        sets: exercise.sets,
        reps: exercise.reps,
        targetWeight: exercise.targetWeight?.toNumber() ?? null,
        targetRpe: exercise.targetRpe?.toNumber() ?? null,
        order: exercise.order,
      })),
    };
  }

  async getCurrentTrainingCycle(): Promise<TrainingCycleDto | null> {
    const trainingCycle = await this.findCurrentTrainingCycle(startOfLocalDay());

    return trainingCycle ? this.toTrainingCycleDto(trainingCycle) : null;
  }

  async getTrainingAdherence(days = 7): Promise<TrainingAdherenceDto> {
    assertPositiveInteger(days, 'days');

    const referenceDate = startOfLocalDay();
    const trainingCycle = await this.findCurrentTrainingCycle(referenceDate);

    if (!trainingCycle) {
      return {
        days,
        plannedSessions: 0,
        completedSessions: 0,
        adherenceRate: null,
      };
    }

    const requestedStartDate = startOfRecentDayWindow(days, referenceDate);
    const cycleStartDate = startOfLocalDay(trainingCycle.startDate);
    const cycleEndDate = startOfLocalDay(trainingCycle.endDate);
    const windowStart =
      cycleStartDate > requestedStartDate ? cycleStartDate : requestedStartDate;
    const windowEnd = cycleEndDate < referenceDate ? cycleEndDate : referenceDate;

    if (windowStart > windowEnd) {
      return {
        days,
        plannedSessions: 0,
        completedSessions: 0,
        adherenceRate: null,
      };
    }

    const [plannedDays, completedSessionDates] = await Promise.all([
      this.prisma.workoutPlan.findMany({
        where: {
          trainingPlanVersion: {
            trainingCycleId: trainingCycle.id,
            status: TrainingPlanVersionStatus.ACTIVE,
          },
        },
        select: {
          dayOfWeek: true,
        },
        distinct: ['dayOfWeek'],
      }),
      this.prisma.workoutSession.findMany({
        where: {
          userProfileId: trainingCycle.userProfileId,
          date: {
            gte: windowStart,
            lte: windowEnd,
          },
          exerciseRecords: {
            some: {
              completed: true,
            },
          },
        },
        select: {
          date: true,
        },
        distinct: ['date'],
      }),
    ]);
    const plannedDaySet = new Set(plannedDays.map(({ dayOfWeek }) => dayOfWeek));
    const plannedSessions = this.countPlannedSessions(windowStart, windowEnd, plannedDaySet);
    const completedSessions = completedSessionDates.length;

    return {
      days,
      plannedSessions,
      completedSessions,
      adherenceRate:
        plannedSessions > 0
          ? roundTo(Math.min(completedSessions / plannedSessions, 1) * 100)
          : null,
    };
  }

  async getRecentExercisePerformance(): Promise<ExercisePerformanceDto[]> {
    const records = await this.prisma.workoutExerciseRecord.findMany({
      include: {
        workoutSession: {
          select: {
            date: true,
            category: true,
          },
        },
      },
      orderBy: [{ workoutSession: { date: 'desc' } }, { createdAt: 'desc' }],
      take: RECENT_EXERCISE_RECORD_LIMIT,
    });

    const recordsByExercise = new Map<string, (typeof records)[number][]>();

    for (const record of records) {
      const normalizedExerciseName = record.exerciseName.trim().toLowerCase();
      const exerciseRecords = recordsByExercise.get(normalizedExerciseName) ?? [];
      exerciseRecords.push(record);
      recordsByExercise.set(normalizedExerciseName, exerciseRecords);
    }

    return [...recordsByExercise.values()].map((exerciseRecords) => {
      const latestRecord = exerciseRecords[0];
      const previousRecord = exerciseRecords[1];
      const rpeValues = exerciseRecords
        .map((record) => record.rpe?.toNumber() ?? null)
        .filter((rpe): rpe is number => rpe !== null);
      const averageRpe =
        rpeValues.length > 0
          ? roundTo(rpeValues.reduce((total, rpe) => total + rpe, 0) / rpeValues.length)
          : null;
      const lastWeight = latestRecord.actualWeight?.toNumber() ?? null;
      const lastRpe = latestRecord.rpe?.toNumber() ?? null;

      return {
        id: latestRecord.id,
        workoutSessionId: latestRecord.workoutSessionId,
        date: latestRecord.workoutSession.date,
        category: latestRecord.workoutSession.category,
        exerciseName: latestRecord.exerciseName,
        actualWeight: lastWeight,
        sets: latestRecord.sets,
        reps: latestRecord.reps,
        rpe: lastRpe,
        completed: latestRecord.completed,
        averageRpe,
        lastWeight,
        lastSets: latestRecord.sets,
        lastReps: latestRecord.reps,
        lastRpe,
        progressTrend: this.getProgressTrend(latestRecord, previousRecord),
      };
    });
  }

  private getProgressTrend(
    latestRecord: ComparableExerciseRecord,
    previousRecord?: ComparableExerciseRecord,
  ): ExerciseProgressTrend {
    if (!previousRecord) {
      return ExerciseProgressTrend.INSUFFICIENT_DATA;
    }

    if (latestRecord.completed !== previousRecord.completed) {
      return latestRecord.completed
        ? ExerciseProgressTrend.IMPROVING
        : ExerciseProgressTrend.DECLINING;
    }

    const latestWeight = latestRecord.actualWeight?.toNumber() ?? null;
    const previousWeight = previousRecord.actualWeight?.toNumber() ?? null;

    if (latestWeight === null || previousWeight === null) {
      return ExerciseProgressTrend.INSUFFICIENT_DATA;
    }

    const weightChange = latestWeight - previousWeight;

    if (weightChange > 0) {
      return ExerciseProgressTrend.IMPROVING;
    }

    if (weightChange < 0) {
      return ExerciseProgressTrend.DECLINING;
    }

    return ExerciseProgressTrend.STABLE;
  }

  private findCurrentTrainingCycle(date: Date): Promise<TrainingCycle | null> {
    return this.prisma.trainingCycle.findFirst({
      where: {
        status: TrainingCycleStatus.ACTIVE,
        startDate: {
          lte: date,
        },
        endDate: {
          gte: date,
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  private countPlannedSessions(
    windowStart: Date,
    windowEnd: Date,
    plannedDays: ReadonlySet<DayOfWeek>,
  ): number {
    let count = 0;
    const cursor = new Date(windowStart);

    while (cursor <= windowEnd) {
      const dayOfWeek = DAY_OF_WEEK_BY_JAVASCRIPT_DAY[cursor.getDay()];

      if (plannedDays.has(dayOfWeek)) {
        count += 1;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  private toTrainingCycleDto(trainingCycle: TrainingCycle): TrainingCycleDto {
    return {
      id: trainingCycle.id,
      name: trainingCycle.name,
      goal: trainingCycle.goal,
      startDate: trainingCycle.startDate,
      endDate: trainingCycle.endDate,
      status: trainingCycle.status,
      createdAt: trainingCycle.createdAt,
      updatedAt: trainingCycle.updatedAt,
    };
  }
}
