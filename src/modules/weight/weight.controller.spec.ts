import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WeightRecordType } from '../../generated/prisma/client';
import { CreateWeightRecordDto } from './dto/create-weight-record.dto';
import { WeightService } from './weight.service';
import { WeightController } from './weight.controller';

describe('WeightController', () => {
  const recordWeight = jest.fn();
  const weightService = {
    recordWeight,
  } as unknown as WeightService;
  const controller = new WeightController(weightService);

  beforeEach(() => {
    recordWeight.mockReset();
  });

  it('delegates a validated weight record to WeightService', async () => {
    const request = plainToInstance(CreateWeightRecordDto, {
      weight: 91.5,
      recordType: 'morning',
      date: '2026-07-30',
    });
    const response = {
      id: 'weight-id',
      weight: 91.5,
      recordType: WeightRecordType.MORNING,
      date: request.date,
      createdAt: new Date('2026-07-30T01:00:00.000Z'),
      updatedAt: new Date('2026-07-30T01:00:00.000Z'),
    };
    recordWeight.mockResolvedValue(response);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.recordWeight(request)).resolves.toBe(response);
    expect(recordWeight).toHaveBeenCalledWith({
      weight: 91.5,
      recordType: WeightRecordType.MORNING,
      date: new Date('2026-07-30T00:00:00.000Z'),
    });
  });

  it('rejects invalid weight, record type and local date values', async () => {
    const request = plainToInstance(CreateWeightRecordDto, {
      weight: 0,
      recordType: 'afternoon',
      date: '2026-02-30',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['weight', 'recordType', 'date']),
    );
    expect(recordWeight).not.toHaveBeenCalled();
  });
});
