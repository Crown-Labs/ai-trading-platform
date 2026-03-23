import { ApiProperty } from '@nestjs/swagger';

export class TestDataDto {
  @ApiProperty({ example: 'Hello from NestJS API!' })
  data: string;

  @ApiProperty({ example: 'Hello from shared package' })
  greeting: string;

  @ApiProperty({ example: '2024-03-23T10:00:00.000Z' })
  timestamp: string;
}
