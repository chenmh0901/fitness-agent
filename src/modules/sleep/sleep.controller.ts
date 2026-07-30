import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateSleepRecordDto } from './dto/create-sleep-record.dto';
import { SleepRecordDto } from './dto/sleep-record.dto';
import { SleepService } from './sleep.service';

@Controller('sleep')
export class SleepController {
  constructor(private readonly sleepService: SleepService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  recordSleep(@Body() request: CreateSleepRecordDto): Promise<SleepRecordDto> {
    return this.sleepService.recordSleep(request);
  }
}
