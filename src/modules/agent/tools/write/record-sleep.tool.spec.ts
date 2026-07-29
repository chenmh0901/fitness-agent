import { SleepRecordDto } from '../../../sleep/dto/sleep-record.dto';
import { SleepService } from '../../../sleep/sleep.service';
import { RecordSleepTool } from './record-sleep.tool';

describe('RecordSleepTool', () => {
  const recordSleep = jest.fn();
  const sleepService = {
    recordSleep,
  } as unknown as SleepService;
  const tool = new RecordSleepTool(sleepService);

  beforeEach(() => {
    recordSleep.mockReset();
  });

  it('exposes the record_sleep function schema', () => {
    expect(tool.name).toBe('record_sleep');
    expect(tool.parameters).toEqual({
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '睡眠记录日期，格式 YYYY-MM-DD',
        },
        durationMinutes: {
          type: 'integer',
          description: '总睡眠时长，单位为分钟',
          minimum: 1,
        },
        quality: {
          type: 'integer',
          description: '主观睡眠质量，1 最差，5 最好',
          minimum: 1,
          maximum: 5,
        },
      },
      required: ['date', 'durationMinutes', 'quality'],
      additionalProperties: false,
    });
  });

  it('normalizes input and delegates the write to SleepService', async () => {
    const date = new Date(2026, 6, 28);
    const savedRecord = {
      id: 'sleep-id',
      date,
      durationMinutes: 360,
      quality: 3,
    } as SleepRecordDto;
    recordSleep.mockResolvedValue(savedRecord);

    await expect(
      tool.execute({
        durationMinutes: 360,
        quality: 3,
        date: '2026-07-28',
      }),
    ).resolves.toBe(savedRecord);
    expect(recordSleep).toHaveBeenCalledWith({
      durationMinutes: 360,
      quality: 3,
      date,
    });
  });

  it.each([
    undefined,
    { durationMinutes: 0, quality: 3, date: '2026-07-28' },
    { durationMinutes: 360.5, quality: 3, date: '2026-07-28' },
    { durationMinutes: 360, quality: 6, date: '2026-07-28' },
  ])('rejects invalid input %p without calling SleepService', async (input) => {
    await expect(tool.execute(input)).rejects.toBeInstanceOf(TypeError);
    expect(recordSleep).not.toHaveBeenCalled();
  });
});
