import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AiService } from './ai.service';
import { AiChatRequestDto } from '../dto/ai-chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Stream AI strategy chat response',
    description:
      'Sends messages to OpenClaw Gateway and streams SSE response back. The AI can respond with analysis text and optionally a StrategyDSL YAML block.',
  })
  @ApiBody({ type: AiChatRequestDto })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of chat completion chunks',
  })
  async chat(
    @Body() body: AiChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.aiService.streamStrategyChat(body.messages, res, body.sessionId);
  }
}
