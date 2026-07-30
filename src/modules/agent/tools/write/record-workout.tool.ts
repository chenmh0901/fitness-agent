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

function readOptionalRpe(input: Record<string, unknown>): number | undefined {
  const value = input.rpe;

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 1 ||
    value > 10 ||
    !Number.isInteger(value * 10)
  ) {
    throw new TypeError('input.rpe must be a number from 1 to 10 with at most one decimal place');
  }

  return value;
}

function readOptionalCompleted(input: Record<string, unknown>): boolean | undefined {
  const value = input.completed;

  if (value !== undefined && typeof value !== 'boolean') {
    throw new TypeError('input.completed must be a boolean');
  }

  return value;
}

@Injectable()
export class RecordWorkoutTool implements AgentTool {
  readonly name = 'record_workout';
  readonly description =
    '记录用户某一天的训练动作反馈，包括重量、组数、每组次数，以及可选的 RPE 和完成状态。';
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
      rpe: {
        type: 'number',
        description: '主观用力程度，范围 1-10',
        minimum: 1,
        maximum: 10,
      },
      completed: {
        type: 'boolean',
        description: '是否完成计划组次',
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
    const workoutInput = {
      exerciseName: requireNonEmptyString(inputRecord, 'exerciseName'),
      weight: requireNonNegativeNumber(inputRecord, 'weight'),
      sets: requirePositiveInteger(inputRecord, 'sets'),
      reps: requirePositiveInteger(inputRecord, 'reps'),
      date: requireLocalDate(inputRecord),
    };
    const rpe = readOptionalRpe(inputRecord);
    const completed = readOptionalCompleted(inputRecord);

    if (rpe === undefined && completed === undefined) {
      return this.workoutService.recordWorkout(workoutInput);
    }

    if (rpe === undefined) {
      throw new TypeError('input.rpe is required when completed is provided');
    }

    return this.workoutService.recordWorkoutFeedback({
      ...workoutInput,
      rpe,
      completed: completed ?? true,
    });
  }
}
