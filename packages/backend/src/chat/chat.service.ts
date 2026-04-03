import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { AddRunDto } from './dto/add-run.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        activeStrategy: true,
        activeRunId: true,
      },
    });
  }

  async getSession(id: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        backtestRuns: { orderBy: { version: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException();
    return session;
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    return this.prisma.chatSession.create({
      data: { userId, title: dto.title ?? 'New Chat' },
    });
  }

  async updateSession(id: string, userId: string, dto: UpdateSessionDto) {
    await this.assertOwner(id, userId);
    return this.prisma.chatSession.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.activeStrategy !== undefined && {
          activeStrategy: dto.activeStrategy,
        }),
        ...(dto.activeRunId !== undefined && {
          activeRunId: dto.activeRunId,
        }),
      },
    });
  }

  async deleteSession(id: string, userId: string) {
    await this.assertOwner(id, userId);
    await this.prisma.chatSession.delete({ where: { id } });
  }

  async addMessage(sessionId: string, userId: string, dto: AddMessageDto) {
    await this.assertOwner(sessionId, userId);
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: dto.role,
        content: dto.content,
        strategy: dto.strategy ?? undefined,
      },
    });
  }

  async addRun(sessionId: string, userId: string, dto: AddRunDto) {
    await this.assertOwner(sessionId, userId);
    const run = await this.prisma.backtestRun.create({
      data: {
        sessionId,
        version: dto.version,
        strategyName: dto.strategyName,
        startDate: dto.startDate,
        endDate: dto.endDate,
        strategy: dto.strategy,
        metrics: dto.metrics,
      },
    });
    // Auto-set as activeRunId
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { activeRunId: run.id },
    });
    return run;
  }

  private async assertOwner(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException();
  }
}
