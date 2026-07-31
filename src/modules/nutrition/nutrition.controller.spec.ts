import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNutritionRecordDto } from './dto/create-nutrition-record.dto';
import { NutritionService } from './nutrition.service';
import { NutritionController } from './nutrition.controller';

describe('NutritionController', () => {
  const createRecord = jest.fn();
  const service = {
    createRecord,
  } as unknown as NutritionService;
  const controller = new NutritionController(service);

  beforeEach(() => {
    createRecord.mockReset();
  });

  it('delegates a validated nutrition record', async () => {
    const request = plainToInstance(CreateNutritionRecordDto, {
      calories: 2200,
      protein: 160,
      carbs: 250,
      fat: 60,
      notes: '  training day  ',
      date: '2026-08-01',
    });
    const result = { id: 'nutrition-id' };
    createRecord.mockResolvedValue(result);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.createRecord(request)).resolves.toBe(result);
    expect(createRecord).toHaveBeenCalledWith({
      calories: 2200,
      protein: 160,
      carbs: 250,
      fat: 60,
      notes: 'training day',
      date: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('rejects invalid macro and date values', async () => {
    const request = plainToInstance(CreateNutritionRecordDto, {
      calories: -1,
      protein: -1,
      carbs: -1,
      fat: -1,
      date: 'invalid',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['calories', 'protein', 'carbs', 'fat', 'date']),
    );
    expect(createRecord).not.toHaveBeenCalled();
  });
});
