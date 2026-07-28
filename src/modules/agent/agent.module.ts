import { Module } from '@nestjs/common';
import { SleepModule } from '../sleep/sleep.module';
import { UserModule } from '../user/user.module';
import { WeightModule } from '../weight/weight.module';
import { WorkoutModule } from '../workout/workout.module';
import { AgentService } from './agent.service';
import { AgentContextService } from './context/agent-context.service';
import { AI_PROVIDER } from './provider/ai-provider.token';
import { UnconfiguredAIProvider } from './provider/unconfigured-ai.provider';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { GetDailyContextTool } from './tools/get-daily-context.tool';
import { GetTodayWorkoutTool } from './tools/get-today-workout.tool';
import { GetWeightTrendTool } from './tools/get-weight-trend.tool';
import { ToolRegistryService } from './tools/tool-registry.service';

@Module({
  imports: [UserModule, WeightModule, SleepModule, WorkoutModule],
  providers: [
    AgentContextService,
    PromptBuilderService,
    AgentService,
    GetDailyContextTool,
    GetWeightTrendTool,
    GetTodayWorkoutTool,
    {
      provide: ToolRegistryService,
      inject: [GetDailyContextTool, GetWeightTrendTool, GetTodayWorkoutTool],
      useFactory: (
        getDailyContextTool: GetDailyContextTool,
        getWeightTrendTool: GetWeightTrendTool,
        getTodayWorkoutTool: GetTodayWorkoutTool,
      ): ToolRegistryService => {
        const registry = new ToolRegistryService();
        registry.register(getDailyContextTool);
        registry.register(getWeightTrendTool);
        registry.register(getTodayWorkoutTool);

        return registry;
      },
    },
    {
      provide: AI_PROVIDER,
      useClass: UnconfiguredAIProvider,
    },
  ],
  exports: [AgentContextService, PromptBuilderService, AgentService, ToolRegistryService],
})
export class AgentModule {}
