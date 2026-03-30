import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [RateLimitModule, UsageModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
