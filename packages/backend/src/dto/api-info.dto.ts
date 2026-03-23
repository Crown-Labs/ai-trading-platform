import { ApiProperty } from '@nestjs/swagger';

export class ApiInfoDto {
  @ApiProperty({ example: 'AI Trading Platform API' })
  message: string;

  @ApiProperty({ example: 'running' })
  status: string;

  @ApiProperty({ example: '1.0.0' })
  version: string;
}
