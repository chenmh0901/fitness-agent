import { FitnessGoal, TrainingCycleStatus } from '../../../generated/prisma/client';

export class TrainingCycleDto {
  id: string;
  name: string;
  goal: FitnessGoal;
  startDate: Date;
  endDate: Date;
  status: TrainingCycleStatus;
  createdAt: Date;
  updatedAt: Date;
}
