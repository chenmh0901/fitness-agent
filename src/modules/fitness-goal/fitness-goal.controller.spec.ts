import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FitnessGoalPriority, FitnessGoalType } from '../../generated/prisma/client';
import { CreateFitnessGoalDto } from './dto/create-fitness-goal.dto';
import { FitnessGoalService } from './fitness-goal.service';
import { FitnessGoalController } from './fitness-goal.controller';

describe('FitnessGoalController', () => {
  const createGoal = jest.fn();
  const getActiveGoal = jest.fn();
  const service = {
    createGoal,
    getActiveGoal,
  } as unknown as FitnessGoalService;
  const controller = new FitnessGoalController(service);

  beforeEach(() => {
    createGoal.mockReset();
    getActiveGoal.mockReset();
  });

  it('delegates a validated goal request', async () => {
    const request = plainToInstance(CreateFitnessGoalDto, {
      type: FitnessGoalType.FAT_LOSS,
      startWeight: 91.7,
      targetWeight: 85,
      targetBodyFat: 16,
      startDate: '2026-08-01',
      targetDate: '2026-09-26',
      durationWeeks: 8,
      priority: FitnessGoalPriority.KEEP_STRENGTH,
    });
    const result = { id: 'goal-id' };
    createGoal.mockResolvedValue(result);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.createGoal(request)).resolves.toBe(result);
    expect(createGoal).toHaveBeenCalledWith({
      type: FitnessGoalType.FAT_LOSS,
      startWeight: 91.7,
      targetWeight: 85,
      targetBodyFat: 16,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      targetDate: new Date('2026-09-26T00:00:00.000Z'),
      durationWeeks: 8,
      priority: FitnessGoalPriority.KEEP_STRENGTH,
    });
  });

  it('rejects invalid goal input', async () => {
    const request = plainToInstance(CreateFitnessGoalDto, {
      type: 'INVALID',
      startWeight: 0,
      targetWeight: 0,
      targetBodyFat: 101,
      startDate: 'invalid',
      targetDate: 'invalid',
      durationWeeks: 0,
      priority: 'INVALID',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'type',
        'startWeight',
        'targetWeight',
        'targetBodyFat',
        'startDate',
        'targetDate',
        'durationWeeks',
        'priority',
      ]),
    );
  });

  it('returns the active goal from the service', async () => {
    const result = { id: 'goal-id' };
    getActiveGoal.mockResolvedValue(result);

    await expect(controller.getActiveGoal()).resolves.toBe(result);
    expect(getActiveGoal).toHaveBeenCalledTimes(1);
  });
});
