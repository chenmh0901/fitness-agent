import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { DailyStatusService } from './daily-status.service';
import { CreateDailyStatusDto } from './dto/create-daily-status.dto';
import { DailyStatusDto } from './dto/daily-status.dto';

@Controller('status')
export class DailyStatusController {
  constructor(private readonly dailyStatusService: DailyStatusService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createStatus(@Body() request: CreateDailyStatusDto): Promise<DailyStatusDto> {
    return this.dailyStatusService.createStatus(request);
  }
}
