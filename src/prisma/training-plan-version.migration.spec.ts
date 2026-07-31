import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('training plan version migration contract', () => {
  const migrationSql = readFileSync(
    resolve(
      process.cwd(),
      'prisma/migrations/20260731040000_training_plan_version_system/migration.sql',
    ),
    'utf8',
  );

  it('creates one active version per cycle and preserves historical versions', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "training_plan_versions"');
    expect(migrationSql).toContain(
      '"training_plan_versions_trainingCycleId_versionNumber_key"',
    );
    expect(migrationSql).toContain('"training_plan_versions_one_active_per_cycle_key"');
    expect(migrationSql).toContain('WHERE "status" = \'active\'');
  });

  it('migrates existing WorkoutPlan rows to active version 1 before dropping the old key', () => {
    const versionOneInsertPosition = migrationSql.indexOf(
      'INSERT INTO "training_plan_versions"',
    );
    const planBackfillPosition = migrationSql.indexOf(
      'SET "trainingPlanVersionId" = version."id"',
    );
    const notNullPosition = migrationSql.indexOf(
      'ALTER COLUMN "trainingPlanVersionId" SET NOT NULL',
    );
    const oldColumnDropPosition = migrationSql.indexOf(
      'DROP COLUMN IF EXISTS "trainingCycleId"',
    );

    expect(versionOneInsertPosition).toBeGreaterThanOrEqual(0);
    expect(migrationSql).toContain('version."versionNumber" = 1');
    expect(planBackfillPosition).toBeGreaterThan(versionOneInsertPosition);
    expect(notNullPosition).toBeGreaterThan(planBackfillPosition);
    expect(oldColumnDropPosition).toBeGreaterThan(notNullPosition);
  });
});
