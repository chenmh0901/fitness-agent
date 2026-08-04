import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


const weightRecords = [
  ['2026-07-16', 91.2],
  ['2026-07-17', 91.3],
  ['2026-07-18', 90.75],
  ['2026-07-19', 91.2],
  ['2026-07-21', 91.2],
  ['2026-07-22', 91.2],
  ['2026-07-23', 91.2],
  ['2026-07-24', 91.1],
  ['2026-07-27', 91.65],
  ['2026-07-28', 91.7],
  ['2026-07-29', 91.0],
  ['2026-07-30', 91.25],
  ['2026-07-31', 91.7],
  ['2026-08-01', 91.25],
  ['2026-08-02', 90.8],
  ['2026-08-03', 91.6],
];


async function main() {

  const user = await prisma.userProfile.findFirst();

  if (!user) {
    throw new Error(
      'No UserProfile found. Run seed first.'
    );
  }


  console.log(
    `Importing data for user ${user.id}`
  );


  for (const [date, weight] of weightRecords) {

    await prisma.weightRecord.upsert({

      where: {
        userId_date_recordType: {
          userId: user.id,
          date: new Date(`${date}T00:00:00.000Z`),
          recordType: 'morning'
        }
      },

      update: {
        weight
      },

      create: {
        userId: user.id,
        weight,
        recordType: 'morning',
        date: new Date(`${date}T00:00:00.000Z`)
      }

    });

  }


  const latestWeight =
    weightRecords[weightRecords.length - 1][1];


  await prisma.userProfile.update({

    where: {
      id: user.id
    },

    data: {
      currentWeight: latestWeight
    }

  });


  console.log(
    `Imported ${weightRecords.length} weight records`
  );


}


main()
  .catch(console.error)
  .finally(async () => {

    await prisma.$disconnect();

  });
