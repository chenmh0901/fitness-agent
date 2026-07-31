DO $$
BEGIN
  CREATE TYPE "training_plan_version_status" AS ENUM ('active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TYPE "coach_adjustment_recommendation_type"
  ADD VALUE IF NOT EXISTS 'training_plan';

CREATE TABLE IF NOT EXISTS "training_plan_versions" (
  "id" UUID NOT NULL,
  "trainingCycleId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "training_plan_version_status" NOT NULL DEFAULT 'active',
  "changeReason" TEXT NOT NULL,
  "createdFromVersionId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_plan_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_plan_versions_trainingCycleId_versionNumber_key"
  ON "training_plan_versions"("trainingCycleId", "versionNumber");

CREATE INDEX IF NOT EXISTS "training_plan_versions_trainingCycleId_status_idx"
  ON "training_plan_versions"("trainingCycleId", "status");

CREATE INDEX IF NOT EXISTS "training_plan_versions_createdFromVersionId_idx"
  ON "training_plan_versions"("createdFromVersionId");

CREATE UNIQUE INDEX IF NOT EXISTS "training_plan_versions_one_active_per_cycle_key"
  ON "training_plan_versions"("trainingCycleId")
  WHERE "status" = 'active';

DO $$
BEGIN
  ALTER TABLE "training_plan_versions"
    ADD CONSTRAINT "training_plan_versions_trainingCycleId_fkey"
    FOREIGN KEY ("trainingCycleId") REFERENCES "training_cycles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE "training_plan_versions"
    ADD CONSTRAINT "training_plan_versions_createdFromVersionId_fkey"
    FOREIGN KEY ("createdFromVersionId") REFERENCES "training_plan_versions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

INSERT INTO "training_plan_versions" (
  "id",
  "trainingCycleId",
  "versionNumber",
  "status",
  "changeReason",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  cycle."id",
  1,
  'active',
  'Migrated existing training plan',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "training_cycles" AS cycle
WHERE NOT EXISTS (
  SELECT 1
  FROM "training_plan_versions" AS version
  WHERE version."trainingCycleId" = cycle."id"
);

ALTER TABLE "workout_plans"
  ADD COLUMN IF NOT EXISTS "trainingPlanVersionId" UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'workout_plans'
      AND column_name = 'trainingCycleId'
  ) THEN
    UPDATE "workout_plans" AS plan
    SET "trainingPlanVersionId" = version."id"
    FROM "training_plan_versions" AS version
    WHERE version."trainingCycleId" = plan."trainingCycleId"
      AND version."versionNumber" = 1
      AND plan."trainingPlanVersionId" IS NULL;
  END IF;
END
$$;

ALTER TABLE "workout_plans"
  ALTER COLUMN "trainingPlanVersionId" SET NOT NULL;

ALTER TABLE "workout_plans"
  DROP CONSTRAINT IF EXISTS "workout_plans_trainingCycleId_fkey";

DROP INDEX IF EXISTS "workout_plans_trainingCycleId_dayOfWeek_order_key";
DROP INDEX IF EXISTS "workout_plans_trainingCycleId_category_idx";

ALTER TABLE "workout_plans"
  DROP COLUMN IF EXISTS "trainingCycleId";

CREATE UNIQUE INDEX IF NOT EXISTS "workout_plans_trainingPlanVersionId_dayOfWeek_order_key"
  ON "workout_plans"("trainingPlanVersionId", "dayOfWeek", "order");

CREATE INDEX IF NOT EXISTS "workout_plans_trainingPlanVersionId_category_idx"
  ON "workout_plans"("trainingPlanVersionId", "category");

DO $$
BEGIN
  ALTER TABLE "workout_plans"
    ADD CONSTRAINT "workout_plans_trainingPlanVersionId_fkey"
    FOREIGN KEY ("trainingPlanVersionId") REFERENCES "training_plan_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
