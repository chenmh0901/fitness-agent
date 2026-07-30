import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    PrismaClient,
    WeightRecordType,
  } from '../src/generated/prisma/client';
  
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  
  const weightRecords = [
  
    {
      date: '2026-07-16',
      weight: 91.2,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-16',
      weight: 92.25,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-17',
      weight: 90.75,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-17',
      weight: 91.6,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-19',
      weight: 91.2,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-19',
      weight: 92.2,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-21',
      weight: 91.2,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-21',
      weight: 92.23,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-22',
      weight: 91.0,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-22',
      weight: 92.85,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-23',
      weight: 91.2,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-23',
      weight: 92.25,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-24',
      weight: 91.1,
      recordType: WeightRecordType.MORNING,
    },
  
    {
      date: '2026-07-26',
      weight: 92.45,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-27',
      weight: 91.65,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-27',
      weight: 92.8,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-28',
      weight: 91.7,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-28',
      weight: 91.8,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-29',
      weight: 91.0,
      recordType: WeightRecordType.MORNING,
    },
    {
      date: '2026-07-29',
      weight: 92.25,
      recordType: WeightRecordType.EVENING,
    },
  
    {
      date: '2026-07-30',
      weight: 91.25,
      recordType: WeightRecordType.MORNING,
    },
  ];
  
  
  const sleepRecords = [
    {
      date: '2026-07-30',
      durationMinutes: 454,
      quality: 4,
      notes:
        'Apple Health weekly average sleep: 7h34m. Awake 5min, REM 1h56m, Core 4h40m, Deep 59min.',
    },
  ];
  
  
  async function main() {
    const user = await prisma.userProfile.findFirst();
  
    if (!user) {
      throw new Error(
        'No UserProfile found. Please run seed first.',
      );
    }
  
  
    console.log(
      `Importing personal data for user: ${user.id}`,
    );
  
  
    for (const record of weightRecords) {
      await prisma.weightRecord.upsert({
        where: {
          userProfileId_date_recordType: {
            userProfileId: user.id,
            date: new Date(record.date),
            recordType: record.recordType,
          },
        },
  
        update: {
          weight: record.weight,
        },
  
        create: {
          userProfileId: user.id,
          date: new Date(record.date),
          weight: record.weight,
          recordType: record.recordType,
        },
      });
    }
  
  
    for (const sleep of sleepRecords) {
      await prisma.sleepRecord.upsert({
        where: {
          userProfileId_date: {
            userProfileId: user.id,
            date: new Date(sleep.date),
          },
        },
  
        update: {
          durationMinutes: sleep.durationMinutes,
          quality: sleep.quality,
          notes: sleep.notes,
        },
  
        create: {
          userProfileId: user.id,
          date: new Date(sleep.date),
          durationMinutes: sleep.durationMinutes,
          quality: sleep.quality,
          notes: sleep.notes,
        },
      });
    }
  
  
    const latestMorningWeight =
      weightRecords
        .filter(
          (item) =>
            item.recordType === WeightRecordType.MORNING,
        )
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime(),
        )[0];
  
  
    if (latestMorningWeight) {
      await prisma.userProfile.update({
        where: {
          id: user.id,
        },
  
        data: {
          currentWeight:
            latestMorningWeight.weight,
        },
      });
    }
  
  
    console.log(
      `Imported ${weightRecords.length} weight records`,
    );
  
    console.log(
      `Imported ${sleepRecords.length} sleep records`,
    );
  
    console.log(
      `Current weight updated: ${latestMorningWeight.weight}kg`,
    );
  }
  
  
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });