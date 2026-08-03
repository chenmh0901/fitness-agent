CREATE TABLE "exercises" (
  "id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "muscleGroup" VARCHAR(80) NOT NULL,
  "equipment" VARCHAR(80) NOT NULL,
  "difficulty" "training_experience" NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_templates" (
  "id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "goal" "profile_fitness_goal" NOT NULL,
  "experience" "training_experience" NOT NULL,
  "daysPerWeek" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_template_exercises" (
  "id" UUID NOT NULL,
  "trainingTemplateId" UUID NOT NULL,
  "exerciseId" UUID NOT NULL,
  "dayOfWeek" "day_of_week" NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "sets" INTEGER NOT NULL,
  "reps" INTEGER NOT NULL,
  "targetWeight" DECIMAL(6,2),
  "targetRpe" DECIMAL(3,1),
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_template_exercises_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "training_plan_versions"
  ADD COLUMN "sourceTemplateId" UUID;

ALTER TABLE "workout_plans"
  ADD COLUMN "exerciseId" UUID;

CREATE UNIQUE INDEX "exercises_name_key"
  ON "exercises"("name");

CREATE INDEX "exercises_category_difficulty_idx"
  ON "exercises"("category", "difficulty");

CREATE UNIQUE INDEX "training_templates_name_key"
  ON "training_templates"("name");

CREATE UNIQUE INDEX "training_templates_goal_experience_daysPerWeek_key"
  ON "training_templates"("goal", "experience", "daysPerWeek");

CREATE UNIQUE INDEX "training_template_exercises_trainingTemplateId_dayOfWeek_order_key"
  ON "training_template_exercises"("trainingTemplateId", "dayOfWeek", "order");

CREATE INDEX "training_template_exercises_trainingTemplateId_dayOfWeek_idx"
  ON "training_template_exercises"("trainingTemplateId", "dayOfWeek");

CREATE INDEX "training_template_exercises_exerciseId_idx"
  ON "training_template_exercises"("exerciseId");

CREATE INDEX "training_plan_versions_sourceTemplateId_idx"
  ON "training_plan_versions"("sourceTemplateId");

CREATE INDEX "workout_plans_exerciseId_idx"
  ON "workout_plans"("exerciseId");

ALTER TABLE "training_template_exercises"
  ADD CONSTRAINT "training_template_exercises_trainingTemplateId_fkey"
  FOREIGN KEY ("trainingTemplateId") REFERENCES "training_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "training_template_exercises"
  ADD CONSTRAINT "training_template_exercises_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "training_plan_versions"
  ADD CONSTRAINT "training_plan_versions_sourceTemplateId_fkey"
  FOREIGN KEY ("sourceTemplateId") REFERENCES "training_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workout_plans"
  ADD CONSTRAINT "workout_plans_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
