import { Injectable } from '@nestjs/common';
import { WeightRecordType } from '../../../../generated/prisma/client';
import { WeightRecordDto } from '../../../weight/dto/weight-record.dto';
import { WeightService } from '../../../weight/weight.service';
import { AgentTool, JsonSchema } from '../agent-tool.interface';
import {
  requireInputRecord,
  requireLocalDate,
  requirePositiveNumber,
} from './write-tool-input.util';

@Injectable()
export class RecordWeightTool implements AgentTool {
  readonly name = 'record_weight';
  readonly description = '记录用户某一天的晨起或晚间体重；相同日期和类型的记录会被更新。';
  readonly parameters: JsonSchema = {
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
  };

  constructor(private readonly weightService: WeightService) {}

  async execute(input?: unknown): Promise<WeightRecordDto> {
    const inputRecord = requireInputRecord(input);
    const recordType = inputRecord.recordType;

    if (recordType !== 'morning' && recordType !== 'evening') {
      throw new TypeError('input.recordType must be morning or evening');
    }

    return this.weightService.recordWeight({
      weight: requirePositiveNumber(inputRecord, 'weight'),
      recordType: recordType === 'morning' ? WeightRecordType.MORNING : WeightRecordType.EVENING,
      date: requireLocalDate(inputRecord),
    });
  }
}
