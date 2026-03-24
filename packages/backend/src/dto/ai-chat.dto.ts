import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ example: 'user', enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ example: 'Buy BTC when RSI is below 30' })
  content: string;
}

export class AiChatRequestDto {
  @ApiProperty({ type: [ChatMessageDto] })
  messages: ChatMessageDto[];

  @ApiProperty({ example: 'session-uuid', required: false })
  sessionId?: string;
}
