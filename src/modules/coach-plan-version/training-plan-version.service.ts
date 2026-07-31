import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DayOfWeek,
  Prisma,
  TrainingCycleStatus,
  TrainingPlanVersionStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInitialTrainingPlanVersionDto,
  CreateNewTrainingPlanVersionDto,
} from './dto/create-training-plan-version.dto';
import { TrainingPlanItemInputDto } from './dto/training-plan-item.dto';
import {
  TrainingPlanChangeDto,
  TrainingPlanVersionDto,
} from './dto/training-plan-version.dto';

const INITIAL_VERSION_NUMBER = 1;
const INITIAL_VERSION_REASON = 'Initial training plan';
const RECENT_PLAN_CHANGE_LIMIT = 5;

interface VersionRecordWithPlans {
  id: string;
  trainingCycleId: string;
  versionNumber: number;
  status: TrainingPlanVersionStatus;
  changeReason: string;
  createdFromVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  workoutPlans: Array<{
    id: string;
    dayOfWeek: DayOfWeek;
    category: string;
    exerciseName: string;
    sets: number;
    reps: number;
    targetWeight: { toNumber(): number } | null;
    targetRpe: { toNumber(): number } | null;
    order: number;
  }>;
}

@Injectable()
export class TrainingPlanVersionService {
  constructor(private readonly prisma: PrismaService) {}

  async createInitialVersion(
    input: CreateInitialTrainingPlanVersionDto,
  ): Promise<TrainingPlanVersionDto> {
    const workoutPlan = this.normalizeWorkoutPlan(input.workoutPlan);
    const reason = this.normalizeReason(input.reason ?? INITIAL_VERSION_REASON);

    return this.prisma.$transaction(async (transaction) => {
      const cycle = await transaction.trainingCycle.findUnique({
        where: {
          id: input.trainingCycleId,
        },
        select: {
          id: true,
        },
      });

      if (!cycle) {
        throw new NotFoundException('Training cycle was not found');
      }

      const existingVersion = await transaction.trainingPlanVersion.findFirst({
        where: {
          trainingCycleId: cycle.id,
        },
        select: {
          id: true,
        },
      });

      if (existingVersion) {
        throw new ConflictException('Training cycle already has a plan version');
      }

      const version = await transaction.trainingPlanVersion.create({
        data: {
          trainingCycleId: cycle.id,
          versionNumber: INITIAL_VERSION_NUMBER,
          status: TrainingPlanVersionStatus.ACTIVE,
          changeReason: reason,
        },
      });
      await transaction.workoutPlan.createMany({
        data: workoutPlan.map((item) => ({
          ...item,
          trainingPlanVersionId: version.id,
        })),
      });

      return this.getVersionById(transaction, version.id);
    });
  }

  createNewVersion(
    input: CreateNewTrainingPlanVersionDto,
  ): Promise<TrainingPlanVersionDto> {
    const normalizedInput = {
      currentVersionId: input.currentVersionId,
      newWorkoutPlan: this.normalizeWorkoutPlan(input.newWorkoutPlan),
      reason: this.normalizeReason(input.reason),
    };

    return this.prisma.$transaction((transaction) =>
      this.createNewVersionInTransaction(transaction, normalizedInput),
    );
  }

  async createNewVersionInTransaction(
    transaction: Prisma.TransactionClient,
    input: CreateNewTrainingPlanVersionDto,
  ): Promise<TrainingPlanVersionDto> {
    const workoutPlan = this.normalizeWorkoutPlan(input.newWorkoutPlan);
    const reason = this.normalizeReason(input.reason);
    const currentVersion = await transaction.trainingPlanVersion.findUnique({
      where: {
        id: input.currentVersionId,
      },
    });

    if (!currentVersion) {
      throw new NotFoundException('Current training plan version was not found');
    }

    if (currentVersion.status !== TrainingPlanVersionStatus.ACTIVE) {
      throw new ConflictException('Only an active training plan version can be replaced');
    }

    if (
      input.expectedTrainingCycleId !== undefined &&
      currentVersion.trainingCycleId !== input.expectedTrainingCycleId
    ) {
      throw new ConflictException(
        'Training plan version does not belong to the adjustment cycle',
      );
    }

    const versionAggregate = await transaction.trainingPlanVersion.aggregate({
      where: {
        trainingCycleId: currentVersion.trainingCycleId,
      },
      _max: {
        versionNumber: true,
      },
    });
    const nextVersionNumber =
      (versionAggregate._max.versionNumber ?? currentVersion.versionNumber) + 1;
    const archived = await transaction.trainingPlanVersion.updateMany({
      where: {
        id: currentVersion.id,
        status: TrainingPlanVersionStatus.ACTIVE,
      },
      data: {
        status: TrainingPlanVersionStatus.ARCHIVED,
      },
    });

    if (archived.count === 0) {
      throw new ConflictException('Training plan version changed during confirmation');
    }

    const newVersion = await transaction.trainingPlanVersion.create({
      data: {
        trainingCycleId: currentVersion.trainingCycleId,
        versionNumber: nextVersionNumber,
        status: TrainingPlanVersionStatus.ACTIVE,
        changeReason: reason,
        createdFromVersionId: currentVersion.id,
      },
    });
    await transaction.workoutPlan.createMany({
      data: workoutPlan.map((item) => ({
        ...item,
        trainingPlanVersionId: newVersion.id,
      })),
    });

    return this.getVersionById(transaction, newVersion.id);
  }

  async getActiveVersion(trainingCycleId?: string): Promise<TrainingPlanVersionDto | null> {
    const cycleId = trainingCycleId ?? (await this.getCurrentTrainingCycleId());

    if (!cycleId) {
      return null;
    }

    const version = await this.prisma.trainingPlanVersion.findFirst({
      where: {
        trainingCycleId: cycleId,
        status: TrainingPlanVersionStatus.ACTIVE,
      },
      include: {
        workoutPlans: {
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return version ? this.toDto(version) : null;
  }

  async getVersionHistory(trainingCycleId?: string): Promise<TrainingPlanVersionDto[]> {
    const cycleId = trainingCycleId ?? (await this.getCurrentTrainingCycleId());

    if (!cycleId) {
      return [];
    }

    const versions = await this.prisma.trainingPlanVersion.findMany({
      where: {
        trainingCycleId: cycleId,
      },
      include: {
        workoutPlans: {
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return versions.map((version) => this.toDto(version));
  }

  getRecentPlanChanges(history: TrainingPlanVersionDto[]): TrainingPlanChangeDto[] {
    const versionNumberById = new Map(
      history.map((version) => [version.id, version.versionNumber]),
    );

    return history
      .filter(
        (version) =>
          version.createdFromVersionId !== null &&
          versionNumberById.has(version.createdFromVersionId),
      )
      .slice(0, RECENT_PLAN_CHANGE_LIMIT)
      .map((version) => ({
        fromVersion: versionNumberById.get(version.createdFromVersionId!)!,
        toVersion: version.versionNumber,
        reason: version.changeReason,
        createdAt: version.createdAt,
      }));
  }

  private async getVersionById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<TrainingPlanVersionDto> {
    const version = await transaction.trainingPlanVersion.findUnique({
      where: {
        id,
      },
      include: {
        workoutPlans: {
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Training plan version was not found after creation');
    }

    return this.toDto(version);
  }

  private async getCurrentTrainingCycleId(): Promise<string | null> {
    const cycle = await this.prisma.trainingCycle.findFirst({
      where: {
        status: TrainingCycleStatus.ACTIVE,
      },
      select: {
        id: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return cycle?.id ?? null;
  }

  normalizeWorkoutPlan(
    workoutPlan: TrainingPlanItemInputDto[],
  ): TrainingPlanItemInputDto[] {
    if (!Array.isArray(workoutPlan) || workoutPlan.length === 0) {
      throw new RangeError('newWorkoutPlan must contain at least one exercise');
    }

    const scheduleKeys = new Set<string>();

    return workoutPlan.map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new TypeError('Each workout plan item must be an object');
      }

      if (!Object.values(DayOfWeek).includes(item.dayOfWeek)) {
        throw new RangeError('dayOfWeek is invalid');
      }

      if (typeof item.category !== 'string' || typeof item.exerciseName !== 'string') {
        throw new TypeError('category and exerciseName must be strings');
      }

      const category = item.category.trim();
      const exerciseName = item.exerciseName.trim();

      if (!category || !exerciseName) {
        throw new TypeError('category and exerciseName must not be empty');
      }

      this.assertPositiveInteger(item.sets, 'sets');
      this.assertPositiveInteger(item.reps, 'reps');
      this.assertPositiveInteger(item.order, 'order');
      this.assertNullableRange(item.targetWeight, 'targetWeight', 0);
      this.assertNullableRange(item.targetRpe, 'targetRpe', 1, 10);

      const scheduleKey = `${item.dayOfWeek}:${item.order}`;

      if (scheduleKeys.has(scheduleKey)) {
        throw new ConflictException(
          `Workout plan contains duplicate order ${item.order} for ${item.dayOfWeek}`,
        );
      }

      scheduleKeys.add(scheduleKey);

      return {
        ...item,
        category,
        exerciseName,
      };
    });
  }

  private normalizeReason(reason: string): string {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new TypeError('reason must not be empty');
    }

    return normalizedReason;
  }

  private assertPositiveInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 1) {
      throw new RangeError(`${fieldName} must be a positive integer`);
    }
  }

  private assertNullableRange(
    value: number | null,
    fieldName: string,
    min: number,
    max = Number.POSITIVE_INFINITY,
  ): void {
    if (
      value !== null &&
      (!Number.isFinite(value) || value < min || value > max)
    ) {
      throw new RangeError(`${fieldName} must be null or between ${min} and ${max}`);
    }
  }

  private toDto(version: VersionRecordWithPlans): TrainingPlanVersionDto {
    return {
      id: version.id,
      trainingCycleId: version.trainingCycleId,
      versionNumber: version.versionNumber,
      status: version.status,
      changeReason: version.changeReason,
      createdFromVersionId: version.createdFromVersionId,
      workoutPlans: version.workoutPlans.map((plan) => ({
        id: plan.id,
        dayOfWeek: plan.dayOfWeek,
        category: plan.category,
        exerciseName: plan.exerciseName,
        sets: plan.sets,
        reps: plan.reps,
        targetWeight: plan.targetWeight?.toNumber() ?? null,
        targetRpe: plan.targetRpe?.toNumber() ?? null,
        order: plan.order,
      })),
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
