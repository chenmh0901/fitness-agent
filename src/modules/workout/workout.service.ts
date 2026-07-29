import { Injectable } from '@nestjs/common';
import { DayOfWeek, TrainingCycle, TrainingCycleStatus } from '../../generated/prisma/client';
import { startOfLocalDay } from '../../common/utils/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { ExercisePerformanceDto } from './dto/exercise-performance.dto';
import { TodayWorkoutDto } from './dto/today-workout.dto';
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

@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}

  async recordWorkout(input: CreateWorkoutRecordDto): Promise<ExercisePerformanceDto> {
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
          completed: true,
        },
      });

      return {
        id: exerciseRecord.id,
        workoutSessionId: workoutSession.id,
        date: workoutSession.date,
        category: workoutSession.category,
        exerciseName: exerciseRecord.exerciseName,
        actualWeight: exerciseRecord.actualWeight?.toNumber() ?? null,
        sets: exerciseRecord.sets,
        reps: exerciseRecord.reps,
        rpe: exerciseRecord.rpe?.toNumber() ?? null,
        completed: exerciseRecord.completed,
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
        trainingCycleId: trainingCycle.id,
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

  async getRecentExercisePerformance(): Promise<ExercisePerformanceDto[]> {
    const records = await this.prisma.workoutExerciseRecord.findMany({
      where: {
        completed: true,
      },
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

    return records.map((record) => ({
      id: record.id,
      workoutSessionId: record.workoutSessionId,
      date: record.workoutSession.date,
      category: record.workoutSession.category,
      exerciseName: record.exerciseName,
      actualWeight: record.actualWeight?.toNumber() ?? null,
      sets: record.sets,
      reps: record.reps,
      rpe: record.rpe?.toNumber() ?? null,
      completed: record.completed,
    }));
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
