import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: 'Active strategy JSON' })
  @IsOptional()
  activeStrategy?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  activeRunId?: string;
}
