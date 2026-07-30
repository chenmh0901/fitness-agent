import { Controller, Get } from '@nestjs/common';
import { DailyFitnessSummaryDto } from './daily-fitness-summary.dto';
import { DailyFitnessService } from './daily-fitness.service';

@Controller('daily')
export class DailyFitnessController {
  constructor(private readonly dailyFitnessService: DailyFitnessService) {}

  @Get('today')
  getToday(): Promise<DailyFitnessSummaryDto> {
    return this.dailyFitnessService.getTodaySummary();
  }
}
