import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  FitnessGoalStatus,
  FitnessGoalType,
  Prisma,
  ProfileFitnessGoal,
  TrainingCycleStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingPlanVersionService } from '../coach-plan-version/training-plan-version.service';
import { TrainingCycleDto } from '../workout/dto/training-cycle.dto';
import { GenerateTrainingPlanDto } from './dto/generate-training-plan.dto';
import { GeneratedTrainingPlanDto } from './dto/generated-training-plan.dto';

const GOAL_TYPE_BY_PROFILE_GOAL: Partial<
  Record<ProfileFitnessGoal, FitnessGoalType>
> = {
  [ProfileFitnessGoal.FAT_LOSS]: FitnessGoalType.FAT_LOSS,
  [ProfileFitnessGoal.MUSCLE_GAIN]: FitnessGoalType.MUSCLE_GAIN,
};

@Injectable()
export class CoachPlanGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingPlanVersionService: TrainingPlanVersionService,
  ) {}

  generatePlan(input: GenerateTrainingPlanDto): Promise<GeneratedTrainingPlanDto> {
    return this.prisma.$transaction((transaction) =>
      this.generatePlanInTransaction(transaction, input),
    );
  }

  private async generatePlanInTransaction(
    transaction: Prisma.TransactionClient,
    input: GenerateTrainingPlanDto,
  ): Promise<GeneratedTrainingPlanDto> {
    const userProfile = await transaction.userProfile.findFirst({
      select: {
        id: true,
        goal: true,
        trainingExperience: true,
        weeklyTrainingDays: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!userProfile) {
      throw new NotFoundException('User profile is required before plan generation');
    }

    if (
      userProfile.goal !== input.goal ||
      userProfile.trainingExperience !== input.experience ||
      userProfile.weeklyTrainingDays !== input.daysPerWeek
    ) {
      throw new BadRequestException(
        'Generation input must match the current user profile',
      );
    }

    const expectedGoalType = GOAL_TYPE_BY_PROFILE_GOAL[input.goal];
    const activeGoal = await transaction.fitnessGoal.findFirst({
      where: {
        userId: userProfile.id,
        status: FitnessGoalStatus.ACTIVE,
      },
      select: {
        type: true,
        startDate: true,
        targetDate: true,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (!activeGoal) {
      throw new NotFoundException('An active fitness goal is required');
    }

    if (!expectedGoalType || activeGoal.type !== expectedGoalType) {
      throw new BadRequestException(
        'Generation input does not match the active fitness goal',
      );
    }

    const activeCycle = await transaction.trainingCycle.findFirst({
      where: {
        userProfileId: userProfile.id,
        status: TrainingCycleStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (activeCycle) {
      throw new ConflictException('An active training cycle already exists');
    }

    const template = await transaction.trainingTemplate.findUnique({
      where: {
        goal_experience_daysPerWeek: {
          goal: input.goal,
          experience: input.experience,
          daysPerWeek: input.daysPerWeek,
        },
      },
      include: {
        templateExercises: {
          include: {
            exercise: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!template) {
      throw new NotFoundException('No matching training template was found');
    }

    const scheduledDays = new Set(
      template.templateExercises.map(({ dayOfWeek }) => dayOfWeek),
    );

    if (
      template.templateExercises.length === 0 ||
      scheduledDays.size !== template.daysPerWeek
    ) {
      throw new UnprocessableEntityException(
        'The matching training template has an invalid schedule',
      );
    }

    const cycle = await transaction.trainingCycle.create({
      data: {
        userProfileId: userProfile.id,
        name: `${template.name} cycle`,
        goal: input.goal,
        startDate: activeGoal.startDate,
        endDate: activeGoal.targetDate,
        status: TrainingCycleStatus.ACTIVE,
      },
    });

    const version = await this.trainingPlanVersionService.createInitialVersionInTransaction(
      transaction,
      {
        trainingCycleId: cycle.id,
        sourceTemplateId: template.id,
        reason: `Generated from template ${template.name}`,
        workoutPlan: template.templateExercises.map((templateExercise) => ({
          exerciseId: templateExercise.exercise.id,
          dayOfWeek: templateExercise.dayOfWeek,
          category: templateExercise.category,
          exerciseName: templateExercise.exercise.name,
          sets: templateExercise.sets,
          reps: templateExercise.reps,
          targetWeight: templateExercise.targetWeight?.toNumber() ?? null,
          targetRpe: templateExercise.targetRpe?.toNumber() ?? null,
          order: templateExercise.order,
        })),
      },
    );

    return {
      cycle: this.toCycleDto(cycle),
      version,
      workouts: version.workoutPlans,
    };
  }

  private toCycleDto(cycle: {
    id: string;
    name: string;
    goal: ProfileFitnessGoal;
    startDate: Date;
    endDate: Date;
    status: TrainingCycleStatus;
    createdAt: Date;
    updatedAt: Date;
  }): TrainingCycleDto {
    return {
      id: cycle.id,
      name: cycle.name,
      goal: cycle.goal,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    };
  }
}
