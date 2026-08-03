import { ProfileFitnessGoal, TrainingExperience } from '../../generated/prisma/client';
import { CoachPlanGeneratorController } from './coach-plan-generator.controller';
import { CoachPlanGeneratorService } from './coach-plan-generator.service';

describe('CoachPlanGeneratorController', () => {
  const generatePlan = jest.fn();
  const controller = new CoachPlanGeneratorController({
    generatePlan,
  } as unknown as CoachPlanGeneratorService);

  beforeEach(() => {
    generatePlan.mockReset();
  });

  it('delegates plan generation without implementing generation logic', async () => {
    const request = {
      goal: ProfileFitnessGoal.FAT_LOSS,
      experience: TrainingExperience.INTERMEDIATE,
      daysPerWeek: 5,
    };
    const response = {
      cycle: { id: 'cycle-id' },
      version: { id: 'version-id', versionNumber: 1 },
      workouts: [{ id: 'workout-id' }],
    };
    generatePlan.mockResolvedValue(response);

    await expect(controller.generatePlan(request)).resolves.toEqual(response);
    expect(generatePlan).toHaveBeenCalledWith(request);
  });
});
