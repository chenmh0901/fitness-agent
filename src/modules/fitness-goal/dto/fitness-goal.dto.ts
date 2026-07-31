import {
  FitnessGoalPriority,
  FitnessGoalStatus,
  FitnessGoalType,
} from '../../../generated/prisma/client';

export class FitnessGoalDto {
  id: string;
  userId: string;
  type: FitnessGoalType;
  startWeight: number;
  targetWeight: number;
  targetBodyFat: number | null;
  startDate: Date;
  targetDate: Date;
  durationWeeks: number;
  priority: FitnessGoalPriority;
  status: FitnessGoalStatus;
  createdAt: Date;
  updatedAt: Date;
}
