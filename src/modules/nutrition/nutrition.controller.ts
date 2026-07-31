import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateNutritionRecordDto } from './dto/create-nutrition-record.dto';
import { NutritionRecordDto } from './dto/nutrition-record.dto';
import { NutritionService } from './nutrition.service';

@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRecord(@Body() request: CreateNutritionRecordDto): Promise<NutritionRecordDto> {
    return this.nutritionService.createRecord(request);
  }
}
