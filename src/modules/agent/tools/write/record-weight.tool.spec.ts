import { WeightRecordType } from '../../../../generated/prisma/client';
import { WeightRecordDto } from '../../../weight/dto/weight-record.dto';
import { WeightService } from '../../../weight/weight.service';
import { RecordWeightTool } from './record-weight.tool';

describe('RecordWeightTool', () => {
  const recordWeight = jest.fn();
  const weightService = {
    recordWeight,
  } as unknown as WeightService;
  const tool = new RecordWeightTool(weightService);

  beforeEach(() => {
    recordWeight.mockReset();
  });

  it('exposes the record_weight function schema', () => {
    expect(tool.name).toBe('record_weight');
    expect(tool.parameters).toEqual({
      type: 'object',
      properties: {
        weight: {
          type: 'number',
          description: '体重，单位为 kg',
          exclusiveMinimum: 0,
        },
        recordType: {
          type: 'string',
          enum: ['morning', 'evening'],
          description: '体重记录时间类型',
        },
        date: {
          type: 'string',
          description: '记录日期，格式 YYYY-MM-DD',
        },
      },
      required: ['weight', 'recordType', 'date'],
      additionalProperties: false,
    });
  });

  it('normalizes input and delegates the write to WeightService', async () => {
    const date = new Date(2026, 6, 29);
    const savedRecord = {
      id: 'weight-id',
      weight: 90.5,
      recordType: WeightRecordType.MORNING,
      date,
    } as WeightRecordDto;
    recordWeight.mockResolvedValue(savedRecord);

    await expect(
      tool.execute({
        weight: 90.5,
        recordType: 'morning',
        date: '2026-07-29',
      }),
    ).resolves.toBe(savedRecord);
    expect(recordWeight).toHaveBeenCalledWith({
      weight: 90.5,
      recordType: WeightRecordType.MORNING,
      date,
    });
  });

  it.each([
    undefined,
    { weight: -1, recordType: 'morning', date: '2026-07-29' },
    { weight: 90.5, recordType: 'noon', date: '2026-07-29' },
    { weight: 90.5, recordType: 'morning', date: '2026-02-30' },
  ])('rejects invalid input %p without calling WeightService', async (input) => {
    await expect(tool.execute(input)).rejects.toBeInstanceOf(TypeError);
    expect(recordWeight).not.toHaveBeenCalled();
  });
});
