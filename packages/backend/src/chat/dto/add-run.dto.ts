import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class AddRunDto {
  @ApiProperty()
  @IsInt()
  version: number;

  @ApiProperty()
  @IsString()
  strategyName: string;

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsString()
  endDate: string;

  @ApiProperty({ description: 'Strategy DSL JSON' })
  strategy: any;

  @ApiProperty({ description: 'Backtest metrics JSON' })
  metrics: any;
}
