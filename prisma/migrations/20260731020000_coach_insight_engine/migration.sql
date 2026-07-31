DO $$
BEGIN
  CREATE TYPE "coach_insight_type" AS ENUM (
    'weight',
    'training',
    'nutrition',
    'recovery'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "coach_insight_severity" AS ENUM (
    'normal',
    'warning',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "coach_insights" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "type" "coach_insight_type" NOT NULL,
  "severity" "coach_insight_severity" NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coach_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coach_insights_userId_date_idx"
  ON "coach_insights"("userId", "date");

CREATE INDEX IF NOT EXISTS "coach_insights_userId_type_severity_idx"
  ON "coach_insights"("userId", "type", "severity");

DO $$
BEGIN
  ALTER TABLE "coach_insights"
    ADD CONSTRAINT "coach_insights_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
