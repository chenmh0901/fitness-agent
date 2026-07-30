import { Module } from '@nestjs/common';
import { SleepModule } from '../sleep/sleep.module';
import { UserModule } from '../user/user.module';
import { WeightModule } from '../weight/weight.module';
import { WorkoutModule } from '../workout/workout.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentContextService } from './context/agent-context.service';
import { DailyFitnessController } from './daily-fitness/daily-fitness.controller';
import { DailyFitnessService } from './daily-fitness/daily-fitness.service';
import { AgentLoopService } from './execution/agent-loop.service';
import { AI_PROVIDER_FACTORY_PROVIDER } from './provider/ai-provider.factory';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { GetDailyContextTool } from './tools/get-daily-context.tool';
import { GetTodayWorkoutTool } from './tools/get-today-workout.tool';
import { GetWeightTrendTool } from './tools/get-weight-trend.tool';
import { ToolRegistryService } from './tools/tool-registry.service';
import { ToolSchemaBuilderService } from './tools/tool-schema-builder.service';
import { RecordSleepTool } from './tools/write/record-sleep.tool';
import { RecordWeightTool } from './tools/write/record-weight.tool';
import { RecordWorkoutTool } from './tools/write/record-workout.tool';

@Module({
  imports: [UserModule, WeightModule, SleepModule, WorkoutModule],
  controllers: [DailyFitnessController, AgentController],
  providers: [
    AgentContextService,
    DailyFitnessService,
    PromptBuilderService,
    AgentLoopService,
    AgentService,
    GetDailyContextTool,
    GetWeightTrendTool,
    GetTodayWorkoutTool,
    RecordWeightTool,
    RecordSleepTool,
    RecordWorkoutTool,
    ToolSchemaBuilderService,
    {
      provide: ToolRegistryService,
      inject: [
        ToolSchemaBuilderService,
        GetDailyContextTool,
        GetWeightTrendTool,
        GetTodayWorkoutTool,
        RecordWeightTool,
        RecordSleepTool,
        RecordWorkoutTool,
      ],
      useFactory: (
        toolSchemaBuilderService: ToolSchemaBuilderService,
        getDailyContextTool: GetDailyContextTool,
        getWeightTrendTool: GetWeightTrendTool,
        getTodayWorkoutTool: GetTodayWorkoutTool,
        recordWeightTool: RecordWeightTool,
        recordSleepTool: RecordSleepTool,
        recordWorkoutTool: RecordWorkoutTool,
      ): ToolRegistryService => {
        const registry = new ToolRegistryService(toolSchemaBuilderService);
        registry.register(getDailyContextTool);
        registry.register(getWeightTrendTool);
        registry.register(getTodayWorkoutTool);
        registry.register(recordWeightTool);
        registry.register(recordSleepTool);
        registry.register(recordWorkoutTool);

        return registry;
      },
    },
    AI_PROVIDER_FACTORY_PROVIDER,
  ],
  exports: [
    AgentContextService,
    DailyFitnessService,
    PromptBuilderService,
    AgentLoopService,
    AgentService,
    ToolRegistryService,
    ToolSchemaBuilderService,
  ],
})
export class AgentModule {}
