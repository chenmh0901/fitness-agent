import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


const sleepRecords = [
  {
    date: '2026-07-28',
    durationMinutes: 438,
    quality: 4,
    notes: '睡眠正常，训练恢复良好'
  },
  {
    date: '2026-07-29',
    durationMinutes: 402,
    quality: 4,
    notes: '轻微疲劳'
  },
  {
    date: '2026-07-30',
    durationMinutes: 454,
    quality: 5,
    notes: '恢复状态很好'
  },
  {
    date: '2026-07-31',
    durationMinutes: 385,
    quality: 3,
    notes: '睡眠不足，白天精神一般'
  },
  {
    date: '2026-08-01',
    durationMinutes: 420,
    quality: 4,
    notes: '正常恢复'
  },
  {
    date: '2026-08-02',
    durationMinutes: 365,
    quality: 3,
    notes: '晚睡导致睡眠减少'
  },
  {
    date: '2026-08-03',
    durationMinutes: 445,
    quality: 5,
    notes: '恢复良好'
  }
];


const nutritionRecords = [
  {
    date: '2026-07-28',
    calories: 2180,
    protein: 165,
    carbs: 260,
    fat: 65
  },
  {
    date: '2026-07-29',
    calories: 2250,
    protein: 155,
    carbs: 280,
    fat: 70
  },
  {
    date: '2026-07-30',
    calories: 2200,
    protein: 162,
    carbs: 250,
    fat: 68
  },
  {
    date: '2026-07-31',
    calories: 2400,
    protein: 145,
    carbs: 310,
    fat: 75
  },
  {
    date: '2026-08-01',
    calories: 2150,
    protein: 170,
    carbs: 230,
    fat: 65
  },
  {
    date: '2026-08-02',
    calories: 2300,
    protein: 150,
    carbs: 290,
    fat: 72
  },
  {
    date: '2026-08-03',
    calories: 2200,
    protein: 160,
    carbs: 250,
    fat: 68
  }
];


const dailyStatuses = [
  {
    date: '2026-07-28',
    fatigue: 3,
    soreness: 4,
    stress: 3,
    energy: 8,
    mood: 8,
    notes: '训练状态正常'
  },
  {
    date: '2026-07-29',
    fatigue: 4,
    soreness: 5,
    stress: 4,
    energy: 7,
    mood: 7,
    notes: '腿部训练后酸痛'
  },
  {
    date: '2026-07-30',
    fatigue: 3,
    soreness: 3,
    stress: 2,
    energy: 9,
    mood: 9,
    notes: '恢复状态很好'
  },
  {
    date: '2026-07-31',
    fatigue: 6,
    soreness: 6,
    stress: 5,
    energy: 6,
    mood: 6,
    notes: '连续训练导致疲劳'
  },
  {
    date: '2026-08-01',
    fatigue: 3,
    soreness: 3,
    stress: 2,
    energy: 8,
    mood: 8,
    notes: '状态恢复'
  },
  {
    date: '2026-08-02',
    fatigue: 5,
    soreness: 5,
    stress: 4,
    energy: 7,
    mood: 7,
    notes: '睡眠不足影响训练'
  },
  {
    date: '2026-08-03',
    fatigue: 3,
    soreness: 2,
    stress: 2,
    energy: 9,
    mood: 9,
    notes: '状态良好'
  }
];


const workoutRecords = [
  {
    date: '2026-07-28',
    exerciseName: 'barbell bench press',
    weight: 80,
    sets: 4,
    reps: 8,
    rpe: 8,
    completed: true
  },
  {
    date: '2026-07-30',
    exerciseName: 'barbell bench press',
    weight: 82.5,
    sets: 4,
    reps: 8,
    rpe: 8,
    completed: true
  },
  {
    date: '2026-08-01',
    exerciseName: 'barbell squat',
    weight: 100,
    sets: 4,
    reps: 6,
    rpe: 8,
    completed: true
  },
  {
    date: '2026-08-03',
    exerciseName: 'barbell squat',
    weight: 102.5,
    sets: 4,
    reps: 6,
    rpe: 9,
    completed: true
  },
  {
    date: '2026-08-03',
    exerciseName: 'lat pulldown',
    weight: 60,
    sets: 4,
    reps: 10,
    rpe: 8,
    completed: true
  }
];


async function main() {

  const user =
    await prisma.userProfile.findFirst();


  if (!user) {
    throw new Error(
      'No user profile found, run seed first'
    );
  }


  console.log(
    'Demo data user:',
    user.id
  );


  // Sleep

  for (const item of sleepRecords) {

    await prisma.sleepRecord.upsert({

      where: {
        userId_date: {
          userId: user.id,
          date: new Date(item.date)
        }
      },

      update: item,

      create: {
        userId: user.id,
        ...item,
        date: new Date(item.date)
      }

    });

  }


  // Nutrition

  for (const item of nutritionRecords) {

    await prisma.nutritionRecord.upsert({

      where: {
        userId_date: {
          userId: user.id,
          date: new Date(item.date)
        }
      },

      update: item,

      create: {
        userId: user.id,
        ...item,
        date: new Date(item.date)
      }

    });

  }


  // Daily Status

  for (const item of dailyStatuses) {

    await prisma.dailyStatus.upsert({

      where: {
        userId_date: {
          userId: user.id,
          date: new Date(item.date)
        }
      },

      update: item,

      create: {
        userId: user.id,
        ...item,
        date: new Date(item.date)
      }

    });

  }


  // Workout Feedback

  for (const item of workoutRecords) {

    await prisma.workoutExerciseRecord.create({

      data: {
        userId: user.id,
        ...item,
        date: new Date(item.date)
      }

    });

  }


  console.log(
    'Demo coach data imported'
  );

}


main()
  .finally(async () => {

    await prisma.$disconnect();

  });
