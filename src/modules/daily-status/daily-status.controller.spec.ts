import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DailyStatusService } from './daily-status.service';
import { CreateDailyStatusDto } from './dto/create-daily-status.dto';
import { DailyStatusController } from './daily-status.controller';

describe('DailyStatusController', () => {
  const createStatus = jest.fn();
  const service = {
    createStatus,
  } as unknown as DailyStatusService;
  const controller = new DailyStatusController(service);

  beforeEach(() => {
    createStatus.mockReset();
  });

  it('delegates a validated daily status', async () => {
    const request = plainToInstance(CreateDailyStatusDto, {
      energyLevel: 7,
      fatigueLevel: 3,
      muscleSoreness: 2,
      stressLevel: 4,
      notes: '  recovered  ',
      date: '2026-08-01',
    });
    const result = { id: 'status-id' };
    createStatus.mockResolvedValue(result);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.createStatus(request)).resolves.toBe(result);
    expect(createStatus).toHaveBeenCalledWith({
      energyLevel: 7,
      fatigueLevel: 3,
      muscleSoreness: 2,
      stressLevel: 4,
      notes: 'recovered',
      date: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it.each([0, 11])('rejects subjective values outside 1-10: %s', async (value) => {
    const request = plainToInstance(CreateDailyStatusDto, {
      energyLevel: value,
      fatigueLevel: value,
      muscleSoreness: value,
      stressLevel: value,
      date: '2026-08-01',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['energyLevel', 'fatigueLevel', 'muscleSoreness', 'stressLevel']),
    );
    expect(createStatus).not.toHaveBeenCalled();
  });
});
