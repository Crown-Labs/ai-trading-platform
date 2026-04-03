import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = 10;
    const baseDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Connected to database');
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error(
            `Failed to connect to database after ${maxRetries} attempts`,
          );
          throw error;
        }
        const delay = baseDelay * attempt;
        this.logger.warn(
          `Database not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
