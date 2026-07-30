import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateWeightRecordDto } from './dto/create-weight-record.dto';
import { WeightRecordDto } from './dto/weight-record.dto';
import { WeightService } from './weight.service';

@Controller('weight')
export class WeightController {
  constructor(private readonly weightService: WeightService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  recordWeight(@Body() request: CreateWeightRecordDto): Promise<WeightRecordDto> {
    return this.weightService.recordWeight(request);
  }
}
