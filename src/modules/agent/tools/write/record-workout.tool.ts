import { Injectable } from '@nestjs/common';
import { ExercisePerformanceDto } from '../../../workout/dto/exercise-performance.dto';
import { WorkoutService } from '../../../workout/workout.service';
import { AgentTool, JsonSchema } from '../agent-tool.interface';
import {
  requireInputRecord,
  requireLocalDate,
  requireNonEmptyString,
  requireNonNegativeNumber,
  requirePositiveInteger,
} from './write-tool-input.util';

@Injectable()
export class RecordWorkoutTool implements AgentTool {
  readonly name = 'record_workout';
  readonly description = '记录用户某一天完成的一个训练动作，包括重量、组数和每组次数。';
  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      exerciseName: {
        type: 'string',
        description: '动作名称，例如 barbell bench press',
      },
      weight: {
        type: 'number',
        description: '实际重量，单位为 kg',
        minimum: 0,
      },
      sets: {
        type: 'integer',
        description: '完成组数',
        minimum: 1,
      },
      reps: {
        type: 'integer',
        description: '每组重复次数',
        minimum: 1,
      },
      date: {
        type: 'string',
        description: '训练日期，格式 YYYY-MM-DD',
      },
    },
    required: ['exerciseName', 'weight', 'sets', 'reps', 'date'],
    additionalProperties: false,
  };

  constructor(private readonly workoutService: WorkoutService) {}

  async execute(input?: unknown): Promise<ExercisePerformanceDto> {
    const inputRecord = requireInputRecord(input);

    return this.workoutService.recordWorkout({
      exerciseName: requireNonEmptyString(inputRecord, 'exerciseName'),
      weight: requireNonNegativeNumber(inputRecord, 'weight'),
      sets: requirePositiveInteger(inputRecord, 'sets'),
      reps: requirePositiveInteger(inputRecord, 'reps'),
      date: requireLocalDate(inputRecord),
    });
  }
}
