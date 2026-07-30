import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSleepRecordDto } from './dto/create-sleep-record.dto';
import { SleepService } from './sleep.service';
import { SleepController } from './sleep.controller';

describe('SleepController', () => {
  const recordSleep = jest.fn();
  const sleepService = {
    recordSleep,
  } as unknown as SleepService;
  const controller = new SleepController(sleepService);

  beforeEach(() => {
    recordSleep.mockReset();
  });

  it('delegates a validated sleep record to SleepService', async () => {
    const request = plainToInstance(CreateSleepRecordDto, {
      durationMinutes: 390,
      quality: 3,
      date: '2026-07-30',
    });
    const response = {
      id: 'sleep-id',
      date: request.date,
      durationMinutes: 390,
      quality: 3,
      notes: null,
      createdAt: new Date('2026-07-30T01:00:00.000Z'),
      updatedAt: new Date('2026-07-30T01:00:00.000Z'),
    };
    recordSleep.mockResolvedValue(response);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.recordSleep(request)).resolves.toBe(response);
    expect(recordSleep).toHaveBeenCalledWith({
      durationMinutes: 390,
      quality: 3,
      date: new Date('2026-07-30T00:00:00.000Z'),
    });
  });

  it('rejects invalid duration, quality and local date values', async () => {
    const request = plainToInstance(CreateSleepRecordDto, {
      durationMinutes: 0,
      quality: 6,
      date: 'not-a-date',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['durationMinutes', 'quality', 'date']),
    );
    expect(recordSleep).not.toHaveBeenCalled();
  });
});
