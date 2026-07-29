import { Injectable } from '@nestjs/common';
import { SleepRecordDto } from '../../../sleep/dto/sleep-record.dto';
import { SleepService } from '../../../sleep/sleep.service';
import { AgentTool, JsonSchema } from '../agent-tool.interface';
import {
  requireInputRecord,
  requireIntegerInRange,
  requireLocalDate,
  requirePositiveInteger,
} from './write-tool-input.util';

@Injectable()
export class RecordSleepTool implements AgentTool {
  readonly name = 'record_sleep';
  readonly description = '记录用户某一天的睡眠时长和主观质量；同一天的记录会被更新。';
  readonly parameters: JsonSchema = {
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
  };

  constructor(private readonly sleepService: SleepService) {}

  async execute(input?: unknown): Promise<SleepRecordDto> {
    const inputRecord = requireInputRecord(input);

    return this.sleepService.recordSleep({
      durationMinutes: requirePositiveInteger(inputRecord, 'durationMinutes'),
      quality: requireIntegerInRange(inputRecord, 'quality', 1, 5),
      date: requireLocalDate(inputRecord),
    });
  }
}
