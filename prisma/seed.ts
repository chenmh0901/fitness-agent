import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DayOfWeek,
  ProfileFitnessGoal,
  PrismaClient,
  TrainingExperience,
  TrainingCycleStatus,
  TrainingPlanVersionStatus,
} from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const profileData = {
  heightCm: 185,
  currentWeight: 91.7,
  goal: ProfileFitnessGoal.FAT_LOSS,
  trainingExperience: TrainingExperience.INTERMEDIATE,
  weeklyTrainingDays: 5,
  dailyCaloriesTarget: 2200,
  proteinTarget: 160,
};

const workoutPlan = [
  {
    dayOfWeek: DayOfWeek.MONDAY,
    category: 'chest',
    exerciseName: 'barbell bench press',
    sets: 4,
    reps: 8,
    targetWeight: 80,
    targetRpe: 8,
    order: 1,
  },
  {
    dayOfWeek: DayOfWeek.MONDAY,
    category: 'chest',
    exerciseName: 'incline dumbbell press',
    sets: 4,
    reps: 10,
    targetWeight: 24,
    targetRpe: 8,
    order: 2,
  },
  {
    dayOfWeek: DayOfWeek.MONDAY,
    category: 'chest',
    exerciseName: 'cable fly',
    sets: 3,
    reps: 12,
    targetWeight: 15,
    targetRpe: 8,
    order: 3,
  },
  {
    dayOfWeek: DayOfWeek.MONDAY,
    category: 'chest',
    exerciseName: 'rope triceps pushdown',
    sets: 3,
    reps: 12,
    targetWeight: 30,
    targetRpe: 8,
    order: 4,
  },
  {
    dayOfWeek: DayOfWeek.TUESDAY,
    category: 'back',
    exerciseName: 'deadlift',
    sets: 4,
    reps: 6,
    targetWeight: 100,
    targetRpe: 8,
    order: 1,
  },
  {
    dayOfWeek: DayOfWeek.TUESDAY,
    category: 'back',
    exerciseName: 'lat pulldown',
    sets: 4,
    reps: 10,
    targetWeight: 60,
    targetRpe: 8,
    order: 2,
  },
  {
    dayOfWeek: DayOfWeek.TUESDAY,
    category: 'back',
    exerciseName: 'barbell row',
    sets: 4,
    reps: 10,
    targetWeight: 60,
    targetRpe: 8,
    order: 3,
  },
  {
    dayOfWeek: DayOfWeek.TUESDAY,
    category: 'back',
    exerciseName: 'dumbbell curl',
    sets: 3,
    reps: 12,
    targetWeight: 12,
    targetRpe: 8,
    order: 4,
  },
  {
    dayOfWeek: DayOfWeek.WEDNESDAY,
    category: 'leg',
    exerciseName: 'barbell back squat',
    sets: 4,
    reps: 8,
    targetWeight: 90,
    targetRpe: 8,
    order: 1,
  },
  {
    dayOfWeek: DayOfWeek.WEDNESDAY,
    category: 'leg',
    exerciseName: 'romanian deadlift',
    sets: 4,
    reps: 10,
    targetWeight: 70,
    targetRpe: 8,
    order: 2,
  },
  {
    dayOfWeek: DayOfWeek.WEDNESDAY,
    category: 'leg',
    exerciseName: 'leg press',
    sets: 4,
    reps: 12,
    targetWeight: 140,
    targetRpe: 8,
    order: 3,
  },
  {
    dayOfWeek: DayOfWeek.WEDNESDAY,
    category: 'leg',
    exerciseName: 'standing calf raise',
    sets: 4,
    reps: 15,
    targetWeight: 60,
    targetRpe: 8,
    order: 4,
  },
  {
    dayOfWeek: DayOfWeek.THURSDAY,
    category: 'shoulder',
    exerciseName: 'barbell overhead press',
    sets: 4,
    reps: 8,
    targetWeight: 45,
    targetRpe: 8,
    order: 1,
  },
  {
    dayOfWeek: DayOfWeek.THURSDAY,
    category: 'shoulder',
    exerciseName: 'dumbbell lateral raise',
    sets: 4,
    reps: 12,
    targetWeight: 10,
    targetRpe: 8,
    order: 2,
  },
  {
    dayOfWeek: DayOfWeek.THURSDAY,
    category: 'shoulder',
    exerciseName: 'face pull',
    sets: 3,
    reps: 15,
    targetWeight: 25,
    targetRpe: 8,
    order: 3,
  },
  {
    dayOfWeek: DayOfWeek.THURSDAY,
    category: 'shoulder',
    exerciseName: 'hanging knee raise',
    sets: 3,
    reps: 12,
    targetWeight: null,
    targetRpe: 8,
    order: 4,
  },
  {
    dayOfWeek: DayOfWeek.FRIDAY,
    category: 'full_body',
    exerciseName: 'front squat',
    sets: 4,
    reps: 8,
    targetWeight: 70,
    targetRpe: 8,
    order: 1,
  },
  {
    dayOfWeek: DayOfWeek.FRIDAY,
    category: 'full_body',
    exerciseName: 'dumbbell bench press',
    sets: 4,
    reps: 10,
    targetWeight: 24,
    targetRpe: 8,
    order: 2,
  },
  {
    dayOfWeek: DayOfWeek.FRIDAY,
    category: 'full_body',
    exerciseName: 'seated cable row',
    sets: 4,
    reps: 10,
    targetWeight: 55,
    targetRpe: 8,
    order: 3,
  },
  {
    dayOfWeek: DayOfWeek.FRIDAY,
    category: 'full_body',
    exerciseName: 'bulgarian split squat',
    sets: 3,
    reps: 10,
    targetWeight: 20,
    targetRpe: 8,
    order: 4,
  },
] as const;

function getLocalDatabaseDate(now = new Date()): Date {
  const timeZone = process.env.APP_TIMEZONE ?? 'Asia/Shanghai';
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== 'literal') {
        parts[part.type] = part.value;
      }

      return parts;
    }, {});

  return new Date(
    Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day)),
  );
}

function getCurrentCycleDates(): { startDate: Date; endDate: Date } {
  const localDate = getLocalDatabaseDate();
  const mondayOffset = (localDate.getUTCDay() + 6) % 7;
  const startDate = new Date(localDate);
  startDate.setUTCDate(startDate.getUTCDate() - mondayOffset);

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 8 * 7 - 1);

  return { startDate, endDate };
}

async function main(): Promise<void> {
  const { startDate, endDate } = getCurrentCycleDates();

  const result = await prisma.$transaction(async (transaction) => {
    const existingProfiles = await transaction.userProfile.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (existingProfiles.length > 1) {
      throw new Error(
        'Seed aborted: the single-user database already contains multiple UserProfile records.',
      );
    }

    const userProfile =
      existingProfiles.length === 0
        ? await transaction.userProfile.create({ data: profileData })
        : await transaction.userProfile.update({
            where: { id: existingProfiles[0].id },
            data: profileData,
          });

    const activeCycles = await transaction.trainingCycle.findMany({
      where: {
        userProfileId: userProfile.id,
        status: TrainingCycleStatus.ACTIVE,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (activeCycles.length > 1) {
      throw new Error('Seed aborted: the user already has multiple active TrainingCycle records.');
    }

    const trainingCycle =
      activeCycles.length === 0
        ? await transaction.trainingCycle.create({
            data: {
              userProfileId: userProfile.id,
              name: '减脂周期 1',
              goal: ProfileFitnessGoal.FAT_LOSS,
              startDate,
              endDate,
              status: TrainingCycleStatus.ACTIVE,
            },
          })
        : await transaction.trainingCycle.update({
            where: { id: activeCycles[0].id },
            data: {
              name: '减脂周期 1',
              goal: ProfileFitnessGoal.FAT_LOSS,
              startDate,
              endDate,
              status: TrainingCycleStatus.ACTIVE,
            },
          });

    let planVersion = await transaction.trainingPlanVersion.findFirst({
      where: {
        trainingCycleId: trainingCycle.id,
        status: TrainingPlanVersionStatus.ACTIVE,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    if (!planVersion) {
      const versionAggregate = await transaction.trainingPlanVersion.aggregate({
        where: {
          trainingCycleId: trainingCycle.id,
        },
        _max: {
          versionNumber: true,
        },
      });
      planVersion = await transaction.trainingPlanVersion.create({
        data: {
          trainingCycleId: trainingCycle.id,
          versionNumber: (versionAggregate._max.versionNumber ?? 0) + 1,
          status: TrainingPlanVersionStatus.ACTIVE,
          changeReason: 'Initial seeded training plan',
        },
      });
    }

    const existingWorkoutPlanCount = await transaction.workoutPlan.count({
      where: {
        trainingPlanVersionId: planVersion.id,
      },
    });

    if (existingWorkoutPlanCount === 0) {
      await transaction.workoutPlan.createMany({
        data: workoutPlan.map((exercise) => ({
          ...exercise,
          trainingPlanVersionId: planVersion.id,
        })),
      });
    }

    return {
      userProfileId: userProfile.id,
      trainingCycleId: trainingCycle.id,
      trainingPlanVersionId: planVersion.id,
      workoutPlanCount:
        existingWorkoutPlanCount === 0 ? workoutPlan.length : existingWorkoutPlanCount,
    };
  });

  console.log('Fitness seed completed.');
  console.log(`UserProfile: ${result.userProfileId}`);
  console.log(`Active TrainingCycle: ${result.trainingCycleId}`);
  console.log(`Active TrainingPlanVersion: ${result.trainingPlanVersionId}`);
  console.log(`WorkoutPlan exercises: ${result.workoutPlanCount}`);
}

main()
  .catch((error: unknown) => {
    console.error('Fitness seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
