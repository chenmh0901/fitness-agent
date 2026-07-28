import { Module } from '@nestjs/common';
import { WeightService } from './weight.service';

@Module({
  providers: [WeightService],
  exports: [WeightService],
})
export class WeightModule {}
