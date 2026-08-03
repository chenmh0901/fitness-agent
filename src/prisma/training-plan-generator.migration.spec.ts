import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('training plan generator migration', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260803010000_training_plan_generator',
      'migration.sql',
    ),
    'utf8',
  );

  it('creates the exercise library and deterministic template tables', () => {
    expect(migration).toContain('CREATE TABLE "exercises"');
    expect(migration).toContain('CREATE TABLE "training_templates"');
    expect(migration).toContain('CREATE TABLE "training_template_exercises"');
    expect(migration).toContain(
      '"training_templates_goal_experience_daysPerWeek_key"',
    );
  });

  it('keeps historical workout plans while adding nullable catalog links', () => {
    expect(migration).toContain('ADD COLUMN "exerciseId" UUID');
    expect(migration).toContain('ADD COLUMN "sourceTemplateId" UUID');
    expect(migration).not.toContain('DROP TABLE "workout_plans"');
    expect(migration).not.toContain('ALTER COLUMN "exerciseId" SET NOT NULL');
  });
});
