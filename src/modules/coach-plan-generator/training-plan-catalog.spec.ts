import {
  DayOfWeek,
  ProfileFitnessGoal,
  TrainingExperience,
} from '../../generated/prisma/client';
import {
  DEFAULT_EXERCISES,
  FAT_LOSS_INTERMEDIATE_5_DAY_TEMPLATE,
} from './training-plan-catalog';

describe('training plan seed catalog', () => {
  it('contains every required exercise with unique names', () => {
    const names = DEFAULT_EXERCISES.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        'barbell bench press',
        'incline dumbbell press',
        'pull up',
        'lat pulldown',
        'barbell row',
        'squat',
        'leg press',
        'overhead press',
        'lateral raise',
        'curl',
        'triceps pushdown',
      ]),
    );
  });

  it('defines the deterministic five-day intermediate fat-loss template', () => {
    const template = FAT_LOSS_INTERMEDIATE_5_DAY_TEMPLATE;
    const categoryByDay = new Map(
      template.exercises.map(({ dayOfWeek, category }) => [dayOfWeek, category]),
    );
    const exerciseNames = new Set(DEFAULT_EXERCISES.map(({ name }) => name));

    expect(template).toMatchObject({
      name: 'fat_loss_intermediate_5_days',
      goal: ProfileFitnessGoal.FAT_LOSS,
      experience: TrainingExperience.INTERMEDIATE,
      daysPerWeek: 5,
    });
    expect(categoryByDay).toEqual(
      new Map([
        [DayOfWeek.MONDAY, 'chest'],
        [DayOfWeek.TUESDAY, 'back'],
        [DayOfWeek.WEDNESDAY, 'leg'],
        [DayOfWeek.THURSDAY, 'shoulder'],
        [DayOfWeek.FRIDAY, 'full_body'],
      ]),
    );
    expect(
      template.exercises.every(({ exerciseName }) =>
        exerciseNames.has(exerciseName),
      ),
    ).toBe(true);
  });
});
