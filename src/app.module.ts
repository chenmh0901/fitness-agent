import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './modules/agent/agent.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { SleepModule } from './modules/sleep/sleep.module';
import { UserModule } from './modules/user/user.module';
import { WeightModule } from './modules/weight/weight.module';
import { WorkoutModule } from './modules/workout/workout.module';
import { environmentValidationSchema } from './common/config/environment.validation';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: environmentValidationSchema,
    }),
    PrismaModule,
    AgentModule,
    UserModule,
    WorkoutModule,
    WeightModule,
    SleepModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
