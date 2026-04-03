import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID Token credential from client-side OAuth' })
  credential: string;
}
