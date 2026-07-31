DO $$
BEGIN
  CREATE TYPE "coach_adjustment_recommendation_type" AS ENUM (
    'nutrition_calories',
    'training_rpe'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "coach_adjustment_status" AS ENUM (
    'pending',
    'accepted',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "coach_adjustments" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "cycleId" UUID NOT NULL,
  "recommendationType" "coach_adjustment_recommendation_type" NOT NULL,
  "oldValue" JSONB NOT NULL,
  "newValue" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "coach_adjustment_status" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coach_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coach_adjustments_userId_createdAt_idx"
  ON "coach_adjustments"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "coach_adjustments_cycleId_status_idx"
  ON "coach_adjustments"("cycleId", "status");

DO $$
BEGIN
  ALTER TABLE "coach_adjustments"
    ADD CONSTRAINT "coach_adjustments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "coach_adjustments"
    ADD CONSTRAINT "coach_adjustments_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "training_cycles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
