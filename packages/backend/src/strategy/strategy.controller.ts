import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StrategyService } from './strategy.service';
import { ParseStrategyDto, StrategyDSLDto } from '../dto';

@ApiTags('strategy')
@Controller('strategy')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Post('parse')
  @ApiOperation({
    summary: 'Parse natural language into a Strategy DSL',
  })
  @ApiResponse({
    status: 201,
    description: 'Strategy parsed successfully',
    type: StrategyDSLDto,
  })
  parseStrategy(@Body() dto: ParseStrategyDto): StrategyDSLDto {
    return this.strategyService.parseFromText(dto.text) as any;
  }
}
