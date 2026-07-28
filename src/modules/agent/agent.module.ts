import { Module } from '@nestjs/common';
import { SleepModule } from '../sleep/sleep.module';
import { UserModule } from '../user/user.module';
import { WeightModule } from '../weight/weight.module';
import { WorkoutModule } from '../workout/workout.module';
import { AgentContextService } from './context/agent-context.service';

@Module({
  imports: [UserModule, WeightModule, SleepModule, WorkoutModule],
  providers: [AgentContextService],
  exports: [AgentContextService],
})
export class AgentModule {}
