DO $$
BEGIN
  CREATE TYPE "coach_fitness_goal_type" AS ENUM ('fat_loss', 'muscle_gain', 'strength');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "fitness_goal_priority" AS ENUM (
    'keep_strength',
    'maximum_fat_loss',
    'balanced'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "fitness_goal_status" AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "fitness_goals" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "coach_fitness_goal_type" NOT NULL,
  "startWeight" DECIMAL(5, 2) NOT NULL,
  "targetWeight" DECIMAL(5, 2) NOT NULL,
  "targetBodyFat" DECIMAL(4, 1),
  "startDate" DATE NOT NULL,
  "targetDate" DATE NOT NULL,
  "durationWeeks" INTEGER NOT NULL,
  "priority" "fitness_goal_priority" NOT NULL,
  "status" "fitness_goal_status" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fitness_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "nutrition_records" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "calories" INTEGER NOT NULL,
  "protein" DECIMAL(6, 2) NOT NULL,
  "carbs" DECIMAL(6, 2) NOT NULL,
  "fat" DECIMAL(6, 2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nutrition_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_statuses" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "energyLevel" INTEGER NOT NULL,
  "fatigueLevel" INTEGER NOT NULL,
  "muscleSoreness" INTEGER NOT NULL,
  "stressLevel" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_statuses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fitness_goals_userId_status_idx"
  ON "fitness_goals"("userId", "status");

CREATE INDEX IF NOT EXISTS "fitness_goals_userId_startDate_idx"
  ON "fitness_goals"("userId", "startDate");

CREATE UNIQUE INDEX IF NOT EXISTS "nutrition_records_userId_date_key"
  ON "nutrition_records"("userId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "daily_statuses_userId_date_key"
  ON "daily_statuses"("userId", "date");

DO $$
BEGIN
  ALTER TABLE "fitness_goals"
    ADD CONSTRAINT "fitness_goals_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "nutrition_records"
    ADD CONSTRAINT "nutrition_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "daily_statuses"
    ADD CONSTRAINT "daily_statuses_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
