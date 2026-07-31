import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CoachAdjustment,
  CoachAdjustmentRecommendationType,
  CoachAdjustmentStatus,
  Prisma,
  TrainingPlanVersionStatus,
} from '../../generated/prisma/client';
import { assertPositiveInteger } from '../../common/utils/date.util';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingPlanVersionService } from '../coach-plan-version/training-plan-version.service';
import { TrainingPlanItemInputDto } from '../coach-plan-version/dto/training-plan-item.dto';
import { CoachAdjustmentDto } from './dto/coach-adjustment.dto';
import { CreateCoachAdjustmentProposalDto } from './dto/create-coach-adjustment-proposal.dto';

const DEFAULT_HISTORY_LIMIT = 20;

interface NormalizedAdjustmentValues {
  oldValue: Prisma.InputJsonObject;
  newValue: Prisma.InputJsonObject;
}

@Injectable()
export class CoachAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingPlanVersionService: TrainingPlanVersionService,
  ) {}

  async createProposal(
    input: CreateCoachAdjustmentProposalDto,
  ): Promise<CoachAdjustmentDto> {
    const reason = input.reason.trim();

    if (!reason) {
      throw new TypeError('reason must not be empty');
    }

    const values = this.validateAndNormalizeValues(input);

    if (JSON.stringify(values.oldValue) === JSON.stringify(values.newValue)) {
      throw new RangeError('oldValue and newValue must be different');
    }

    const userId = await this.getSingleUserId();
    const cycle = await this.prisma.trainingCycle.findFirst({
      where: {
        id: input.cycleId,
        userProfileId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException('Training cycle was not found for the current user');
    }

    if (
      input.recommendationType === CoachAdjustmentRecommendationType.TRAINING_PLAN
    ) {
      const currentVersion = await this.prisma.trainingPlanVersion.findFirst({
        where: {
          id: this.readStoredString(values.oldValue, 'versionId'),
          trainingCycleId: cycle.id,
          status: TrainingPlanVersionStatus.ACTIVE,
        },
        select: {
          id: true,
        },
      });

      if (!currentVersion) {
        throw new NotFoundException(
          'Active training plan version was not found for the adjustment cycle',
        );
      }
    }

    const adjustment = await this.prisma.coachAdjustment.create({
      data: {
        userId,
        cycleId: cycle.id,
        recommendationType: input.recommendationType,
        oldValue: values.oldValue,
        newValue: values.newValue,
        reason,
        status: CoachAdjustmentStatus.PENDING,
      },
    });

    return this.toDto(adjustment);
  }

  acceptAdjustment(id: string): Promise<CoachAdjustmentDto> {
    return this.transitionAdjustment(id, CoachAdjustmentStatus.ACCEPTED);
  }

  rejectAdjustment(id: string): Promise<CoachAdjustmentDto> {
    return this.transitionAdjustment(id, CoachAdjustmentStatus.REJECTED);
  }

  async getHistory(limit = DEFAULT_HISTORY_LIMIT): Promise<CoachAdjustmentDto[]> {
    assertPositiveInteger(limit, 'limit');

    const userProfile = await this.findSingleUser();

    if (!userProfile) {
      return [];
    }

    const adjustments = await this.prisma.coachAdjustment.findMany({
      where: {
        userId: userProfile.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return adjustments.map((adjustment) => this.toDto(adjustment));
  }

  private async transitionAdjustment(
    id: string,
    nextStatus: CoachAdjustmentStatus,
  ): Promise<CoachAdjustmentDto> {
    const userId = await this.getSingleUserId();
    const currentAdjustment = await this.prisma.coachAdjustment.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!currentAdjustment) {
      throw new NotFoundException('Coach adjustment was not found');
    }

    if (currentAdjustment.status !== CoachAdjustmentStatus.PENDING) {
      throw new ConflictException(
        `Coach adjustment is already ${currentAdjustment.status.toLowerCase()}`,
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.coachAdjustment.updateMany({
        where: {
          id,
          userId,
          status: CoachAdjustmentStatus.PENDING,
        },
        data: {
          status: nextStatus,
        },
      });

      if (transition.count === 0) {
        throw new ConflictException('Coach adjustment status changed during confirmation');
      }

      if (
        nextStatus === CoachAdjustmentStatus.ACCEPTED &&
        currentAdjustment.recommendationType ===
          CoachAdjustmentRecommendationType.NUTRITION_CALORIES
      ) {
        const oldCalories = this.readStoredNumber(currentAdjustment.oldValue, 'calories');
        const newCalories = this.readStoredNumber(currentAdjustment.newValue, 'calories');
        const profileUpdate = await transaction.userProfile.updateMany({
          where: {
            id: userId,
            dailyCaloriesTarget: oldCalories,
          },
          data: {
            dailyCaloriesTarget: newCalories,
          },
        });

        if (profileUpdate.count === 0) {
          throw new ConflictException(
            'Current calorie target no longer matches the proposal oldValue',
          );
        }
      }

      if (
        nextStatus === CoachAdjustmentStatus.ACCEPTED &&
        currentAdjustment.recommendationType ===
          CoachAdjustmentRecommendationType.TRAINING_PLAN
      ) {
        await this.trainingPlanVersionService.createNewVersionInTransaction(transaction, {
          currentVersionId: this.readStoredString(
            currentAdjustment.oldValue,
            'versionId',
          ),
          expectedTrainingCycleId: currentAdjustment.cycleId,
          newWorkoutPlan: this.readStoredWorkoutPlan(currentAdjustment.newValue),
          reason: currentAdjustment.reason,
        });
      }

      const adjustment = await transaction.coachAdjustment.findUnique({
        where: {
          id,
        },
      });

      if (!adjustment) {
        throw new NotFoundException('Coach adjustment was not found after transition');
      }

      return this.toDto(adjustment);
    });
  }

  private validateAndNormalizeValues(
    input: CreateCoachAdjustmentProposalDto,
  ): NormalizedAdjustmentValues {
    switch (input.recommendationType) {
      case CoachAdjustmentRecommendationType.NUTRITION_CALORIES:
        return {
          oldValue: {
            calories: this.readExactNumber(input.oldValue, 'calories', {
              integer: true,
              min: 1,
            }),
          },
          newValue: {
            calories: this.readExactNumber(input.newValue, 'calories', {
              integer: true,
              min: 1,
            }),
          },
        };
      case CoachAdjustmentRecommendationType.TRAINING_RPE:
        return {
          oldValue: {
            targetRpe: this.readExactNumber(input.oldValue, 'targetRpe', {
              min: 1,
              max: 10,
            }),
          },
          newValue: {
            targetRpe: this.readExactNumber(input.newValue, 'targetRpe', {
              min: 1,
              max: 10,
            }),
          },
        };
      case CoachAdjustmentRecommendationType.TRAINING_PLAN:
        return {
          oldValue: {
            versionId: this.readExactString(input.oldValue, 'versionId'),
          },
          newValue: {
            workoutPlan: this.toJsonWorkoutPlan(
              this.trainingPlanVersionService.normalizeWorkoutPlan(
                this.readExactWorkoutPlan(input.newValue),
              ),
            ),
          },
        };
      default:
        throw new RangeError('Unsupported coach adjustment recommendation type');
    }
  }

  private readExactNumber(
    value: Readonly<Record<string, unknown>>,
    key: string,
    options: {
      integer?: boolean;
      min: number;
      max?: number;
    },
  ): number {
    const keys = Object.keys(value);
    const numberValue = value[key];

    if (
      keys.length !== 1 ||
      keys[0] !== key ||
      typeof numberValue !== 'number' ||
      !Number.isFinite(numberValue) ||
      (options.integer && !Number.isInteger(numberValue)) ||
      numberValue < options.min ||
      (options.max !== undefined && numberValue > options.max)
    ) {
      throw new RangeError(
        `${key} must be ${options.integer ? 'an integer ' : ''}between ${options.min} and ${options.max ?? 'infinity'}`,
      );
    }

    return numberValue;
  }

  private readStoredNumber(value: unknown, key: string): number {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>)[key] !== 'number'
    ) {
      throw new TypeError(`Stored coach adjustment ${key} is invalid`);
    }

    return (value as Record<string, number>)[key];
  }

  private readExactString(
    value: Readonly<Record<string, unknown>>,
    key: string,
  ): string {
    const keys = Object.keys(value);
    const stringValue = value[key];

    if (
      keys.length !== 1 ||
      keys[0] !== key ||
      typeof stringValue !== 'string' ||
      !stringValue.trim()
    ) {
      throw new TypeError(`${key} must be the only non-empty string field`);
    }

    return stringValue.trim();
  }

  private readExactWorkoutPlan(
    value: Readonly<Record<string, unknown>>,
  ): TrainingPlanItemInputDto[] {
    const keys = Object.keys(value);
    const workoutPlan = value.workoutPlan;

    if (keys.length !== 1 || keys[0] !== 'workoutPlan' || !Array.isArray(workoutPlan)) {
      throw new TypeError('newValue must contain only a workoutPlan array');
    }

    return workoutPlan as TrainingPlanItemInputDto[];
  }

  private readStoredString(value: unknown, key: string): string {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>)[key] !== 'string'
    ) {
      throw new TypeError(`Stored coach adjustment ${key} is invalid`);
    }

    return (value as Record<string, string>)[key];
  }

  private readStoredWorkoutPlan(value: unknown): TrainingPlanItemInputDto[] {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      !Array.isArray((value as Record<string, unknown>).workoutPlan)
    ) {
      throw new TypeError('Stored coach adjustment workoutPlan is invalid');
    }

    return this.trainingPlanVersionService.normalizeWorkoutPlan(
      (value as { workoutPlan: TrainingPlanItemInputDto[] }).workoutPlan,
    );
  }

  private toJsonWorkoutPlan(
    workoutPlan: TrainingPlanItemInputDto[],
  ): Prisma.InputJsonArray {
    return workoutPlan.map((item) => ({
      dayOfWeek: item.dayOfWeek,
      category: item.category,
      exerciseName: item.exerciseName,
      sets: item.sets,
      reps: item.reps,
      targetWeight: item.targetWeight,
      targetRpe: item.targetRpe,
      order: item.order,
    }));
  }

  private async getSingleUserId(): Promise<string> {
    const userProfile = await this.findSingleUser();

    if (!userProfile) {
      throw new Error('User profile is not configured');
    }

    return userProfile.id;
  }

  private findSingleUser(): Promise<{ id: string } | null> {
    return this.prisma.userProfile.findFirst({
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private toDto(adjustment: CoachAdjustment): CoachAdjustmentDto {
    return {
      id: adjustment.id,
      userId: adjustment.userId,
      cycleId: adjustment.cycleId,
      recommendationType: adjustment.recommendationType,
      oldValue: adjustment.oldValue,
      newValue: adjustment.newValue,
      reason: adjustment.reason,
      status: adjustment.status,
      createdAt: adjustment.createdAt,
      updatedAt: adjustment.updatedAt,
    };
  }
}
