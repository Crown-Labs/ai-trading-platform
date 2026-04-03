import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google OAuth credential (ID token from Google Sign-In)',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  @IsString()
  credential: string;
}
