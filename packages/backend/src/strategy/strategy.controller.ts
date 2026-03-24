import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StrategyService } from './strategy.service';
import { ParseStrategyDto, ParseStrategyResponseDto } from '../dto';

@ApiTags('strategy')
@Controller('strategy')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Post('parse')
  @ApiOperation({
    summary: 'Parse natural language into a Strategy DSL via AI',
  })
  @ApiResponse({
    status: 201,
    description: 'Strategy parsed successfully',
    type: ParseStrategyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or AI could not produce valid strategy',
  })
  async parseStrategy(
    @Body() dto: ParseStrategyDto,
  ): Promise<ParseStrategyResponseDto> {
    const strategy = await this.strategyService.parseFromText(dto.text);
    return { strategy };
  }
}
