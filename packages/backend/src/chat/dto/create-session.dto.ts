import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ required: false, default: 'New Chat' })
  @IsOptional()
  @IsString()
  title?: string;
}
