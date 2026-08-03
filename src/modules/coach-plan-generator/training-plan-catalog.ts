import {
  DayOfWeek,
  ProfileFitnessGoal,
  TrainingExperience,
} from '../../generated/prisma/client';

export interface ExerciseSeedDefinition {
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  difficulty: TrainingExperience;
  description: string;
}

export interface TrainingTemplateExerciseSeedDefinition {
  dayOfWeek: DayOfWeek;
  category: string;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  targetRpe: number | null;
  order: number;
}

export interface TrainingTemplateSeedDefinition {
  name: string;
  goal: ProfileFitnessGoal;
  experience: TrainingExperience;
  daysPerWeek: number;
  exercises: TrainingTemplateExerciseSeedDefinition[];
}

const INTERMEDIATE = TrainingExperience.INTERMEDIATE;

export const DEFAULT_EXERCISES: readonly ExerciseSeedDefinition[] = [
  {
    name: 'barbell bench press',
    category: 'chest',
    muscleGroup: 'chest',
    equipment: 'barbell',
    difficulty: INTERMEDIATE,
    description: 'Horizontal barbell press for chest and triceps strength.',
  },
  {
    name: 'incline dumbbell press',
    category: 'chest',
    muscleGroup: 'upper_chest',
    equipment: 'dumbbell',
    difficulty: INTERMEDIATE,
    description: 'Incline press emphasizing the upper chest.',
  },
  {
    name: 'pull up',
    category: 'back',
    muscleGroup: 'lats',
    equipment: 'pull_up_bar',
    difficulty: INTERMEDIATE,
    description: 'Vertical bodyweight pull for the lats and upper back.',
  },
  {
    name: 'lat pulldown',
    category: 'back',
    muscleGroup: 'lats',
    equipment: 'cable_machine',
    difficulty: INTERMEDIATE,
    description: 'Cable vertical pull for controlled lat volume.',
  },
  {
    name: 'barbell row',
    category: 'back',
    muscleGroup: 'upper_back',
    equipment: 'barbell',
    difficulty: INTERMEDIATE,
    description: 'Horizontal barbell pull for back strength and thickness.',
  },
  {
    name: 'squat',
    category: 'leg',
    muscleGroup: 'quadriceps_glutes',
    equipment: 'barbell',
    difficulty: INTERMEDIATE,
    description: 'Compound lower-body movement for quadriceps and glutes.',
  },
  {
    name: 'leg press',
    category: 'leg',
    muscleGroup: 'quadriceps_glutes',
    equipment: 'machine',
    difficulty: INTERMEDIATE,
    description: 'Machine lower-body press for stable leg volume.',
  },
  {
    name: 'overhead press',
    category: 'shoulder',
    muscleGroup: 'shoulders',
    equipment: 'barbell',
    difficulty: INTERMEDIATE,
    description: 'Vertical press for shoulder and triceps strength.',
  },
  {
    name: 'lateral raise',
    category: 'shoulder',
    muscleGroup: 'lateral_deltoid',
    equipment: 'dumbbell',
    difficulty: INTERMEDIATE,
    description: 'Shoulder isolation movement for lateral deltoid volume.',
  },
  {
    name: 'curl',
    category: 'arms',
    muscleGroup: 'biceps',
    equipment: 'dumbbell',
    difficulty: INTERMEDIATE,
    description: 'Elbow flexion accessory for the biceps.',
  },
  {
    name: 'triceps pushdown',
    category: 'arms',
    muscleGroup: 'triceps',
    equipment: 'cable_machine',
    difficulty: INTERMEDIATE,
    description: 'Cable elbow extension accessory for the triceps.',
  },
] as const;

export const FAT_LOSS_INTERMEDIATE_5_DAY_TEMPLATE: TrainingTemplateSeedDefinition = {
  name: 'fat_loss_intermediate_5_days',
  goal: ProfileFitnessGoal.FAT_LOSS,
  experience: TrainingExperience.INTERMEDIATE,
  daysPerWeek: 5,
  exercises: [
    { dayOfWeek: DayOfWeek.MONDAY, category: 'chest', exerciseName: 'barbell bench press', sets: 4, reps: 8, targetWeight: null, targetRpe: 8, order: 1 },
    { dayOfWeek: DayOfWeek.MONDAY, category: 'chest', exerciseName: 'incline dumbbell press', sets: 3, reps: 10, targetWeight: null, targetRpe: 8, order: 2 },
    { dayOfWeek: DayOfWeek.TUESDAY, category: 'back', exerciseName: 'pull up', sets: 4, reps: 8, targetWeight: null, targetRpe: 8, order: 1 },
    { dayOfWeek: DayOfWeek.TUESDAY, category: 'back', exerciseName: 'lat pulldown', sets: 3, reps: 10, targetWeight: null, targetRpe: 8, order: 2 },
    { dayOfWeek: DayOfWeek.TUESDAY, category: 'back', exerciseName: 'barbell row', sets: 4, reps: 8, targetWeight: null, targetRpe: 8, order: 3 },
    { dayOfWeek: DayOfWeek.WEDNESDAY, category: 'leg', exerciseName: 'squat', sets: 4, reps: 8, targetWeight: null, targetRpe: 8, order: 1 },
    { dayOfWeek: DayOfWeek.WEDNESDAY, category: 'leg', exerciseName: 'leg press', sets: 3, reps: 12, targetWeight: null, targetRpe: 8, order: 2 },
    { dayOfWeek: DayOfWeek.THURSDAY, category: 'shoulder', exerciseName: 'overhead press', sets: 4, reps: 8, targetWeight: null, targetRpe: 8, order: 1 },
    { dayOfWeek: DayOfWeek.THURSDAY, category: 'shoulder', exerciseName: 'lateral raise', sets: 3, reps: 12, targetWeight: null, targetRpe: 8, order: 2 },
    { dayOfWeek: DayOfWeek.FRIDAY, category: 'full_body', exerciseName: 'squat', sets: 3, reps: 10, targetWeight: null, targetRpe: 8, order: 1 },
    { dayOfWeek: DayOfWeek.FRIDAY, category: 'full_body', exerciseName: 'barbell bench press', sets: 3, reps: 10, targetWeight: null, targetRpe: 8, order: 2 },
    { dayOfWeek: DayOfWeek.FRIDAY, category: 'full_body', exerciseName: 'barbell row', sets: 3, reps: 10, targetWeight: null, targetRpe: 8, order: 3 },
    { dayOfWeek: DayOfWeek.FRIDAY, category: 'full_body', exerciseName: 'curl', sets: 3, reps: 12, targetWeight: null, targetRpe: 8, order: 4 },
    { dayOfWeek: DayOfWeek.FRIDAY, category: 'full_body', exerciseName: 'triceps pushdown', sets: 3, reps: 12, targetWeight: null, targetRpe: 8, order: 5 },
  ],
};

export const DEFAULT_TRAINING_TEMPLATES: readonly TrainingTemplateSeedDefinition[] = [
  FAT_LOSS_INTERMEDIATE_5_DAY_TEMPLATE,
] as const;
