import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AddMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false, description: 'Attached strategy JSON' })
  @IsOptional()
  strategy?: any;
}
