import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  AddMessageDto,
  AddRunDto,
} from './dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List user chat sessions' })
  @ApiResponse({ status: 200, description: 'Array of session metadata' })
  async listSessions(@Req() req: any) {
    return this.chatService.listSessions(req.user.id);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Created session' })
  async createSession(@Req() req: any, @Body() dto: CreateSessionDto) {
    return this.chatService.createSession(req.user.id, dto);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session with messages and backtest runs' })
  @ApiResponse({ status: 200, description: 'Full session data' })
  async getSession(@Req() req: any, @Param('id') id: string) {
    return this.chatService.getSession(id, req.user.id);
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Update session title, strategy, or active run' })
  @ApiResponse({ status: 200, description: 'Updated session' })
  async updateSession(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.chatService.updateSession(id, req.user.id, dto);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete a chat session (cascades)' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  async deleteSession(@Req() req: any, @Param('id') id: string) {
    return this.chatService.deleteSession(id, req.user.id);
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Add a message to a session' })
  @ApiResponse({ status: 201, description: 'Created message' })
  async addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.chatService.addMessage(id, req.user.id, dto);
  }

  @Post('sessions/:id/runs')
  @ApiOperation({ summary: 'Add a backtest run to a session' })
  @ApiResponse({ status: 201, description: 'Created backtest run' })
  async addRun(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddRunDto,
  ) {
    return this.chatService.addRun(id, req.user.id, dto);
  }
}
