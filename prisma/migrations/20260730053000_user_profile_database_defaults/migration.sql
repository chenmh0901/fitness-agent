-- Allow database-side clients such as Prisma Studio to omit system-managed fields.
ALTER TABLE "user_profiles"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
