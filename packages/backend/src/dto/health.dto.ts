import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({ example: 'healthy', description: 'Health status of the API' })
  status: string;
}
