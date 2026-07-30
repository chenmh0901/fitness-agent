-- CreateEnum
CREATE TYPE "fitness_goal" AS ENUM ('fat_loss', 'muscle_gain', 'maintenance');

-- CreateEnum
CREATE TYPE "training_experience" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "training_cycle_status" AS ENUM ('planned', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "weight_record_type" AS ENUM ('morning', 'evening');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "heightCm" DECIMAL(5,2) NOT NULL,
    "currentWeight" DECIMAL(5,2) NOT NULL,
    "goal" "fitness_goal" NOT NULL,
    "trainingExperience" "training_experience" NOT NULL,
    "weeklyTrainingDays" INTEGER NOT NULL,
    "dailyCaloriesTarget" INTEGER NOT NULL,
    "proteinTarget" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_cycles" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "goal" "fitness_goal" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "training_cycle_status" NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "training_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" UUID NOT NULL,
    "trainingCycleId" UUID NOT NULL,
    "dayOfWeek" "day_of_week" NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "exerciseName" VARCHAR(150) NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "targetWeight" DECIMAL(6,2),
    "targetRpe" DECIMAL(3,1),
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "trainingCycleId" UUID,
    "date" DATE NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercise_records" (
    "id" UUID NOT NULL,
    "workoutSessionId" UUID NOT NULL,
    "exerciseName" VARCHAR(150) NOT NULL,
    "actualWeight" DECIMAL(6,2),
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "rpe" DECIMAL(3,1),
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workout_exercise_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "recordType" "weight_record_type" NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_records" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sleep_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_cycles_userProfileId_status_idx" ON "training_cycles"("userProfileId", "status");

-- CreateIndex
CREATE INDEX "training_cycles_userProfileId_startDate_idx" ON "training_cycles"("userProfileId", "startDate");

-- CreateIndex
CREATE INDEX "workout_plans_trainingCycleId_category_idx" ON "workout_plans"("trainingCycleId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plans_trainingCycleId_dayOfWeek_order_key" ON "workout_plans"("trainingCycleId", "dayOfWeek", "order");

-- CreateIndex
CREATE INDEX "workout_sessions_userProfileId_date_idx" ON "workout_sessions"("userProfileId", "date");

-- CreateIndex
CREATE INDEX "workout_sessions_trainingCycleId_date_idx" ON "workout_sessions"("trainingCycleId", "date");

-- CreateIndex
CREATE INDEX "workout_sessions_category_date_idx" ON "workout_sessions"("category", "date");

-- CreateIndex
CREATE INDEX "workout_exercise_records_workoutSessionId_idx" ON "workout_exercise_records"("workoutSessionId");

-- CreateIndex
CREATE INDEX "workout_exercise_records_exerciseName_idx" ON "workout_exercise_records"("exerciseName");

-- CreateIndex
CREATE UNIQUE INDEX "weight_records_userProfileId_date_recordType_key" ON "weight_records"("userProfileId", "date", "recordType");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_records_userProfileId_date_key" ON "sleep_records"("userProfileId", "date");

-- AddForeignKey
ALTER TABLE "training_cycles" ADD CONSTRAINT "training_cycles_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_trainingCycleId_fkey" FOREIGN KEY ("trainingCycleId") REFERENCES "training_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_trainingCycleId_fkey" FOREIGN KEY ("trainingCycleId") REFERENCES "training_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise_records" ADD CONSTRAINT "workout_exercise_records_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
