import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.redis.connect().catch(() => {
      // Redis connection failures are non-fatal; rate limiting will be bypassed
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async checkAndIncrement(userId: string, limit: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = 60_000; // 1 minute sliding window
    const windowStart = now - windowMs;
    const key = `ratelimit:${userId}`;

    try {
      // Sliding window using sorted set
      const pipeline = this.redis.pipeline();
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Count current entries
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);
      // Set expiry on the key
      pipeline.expire(key, 60);

      const results = await pipeline.exec();
      if (!results) {
        return { allowed: true, remaining: limit, limit, resetAt: now + windowMs };
      }

      const currentCount = (results[1]?.[1] as number) || 0;

      if (currentCount >= limit) {
        // Over limit - remove the entry we just added
        // Actually, since we check count before the add takes effect in the pipeline,
        // we need to handle this differently
        // The zcard was before zadd, so currentCount is the count before this request
        // If currentCount >= limit, we're over
        if (currentCount >= limit) {
          // Remove the entry we just added
          await this.redis.zremrangebyscore(key, now, now + 1);
          return {
            allowed: false,
            remaining: 0,
            limit,
            resetAt: now + windowMs,
          };
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, limit - currentCount - 1),
        limit,
        resetAt: now + windowMs,
      };
    } catch {
      // If Redis is down, allow the request (fail open)
      return { allowed: true, remaining: limit, limit, resetAt: now + windowMs };
    }
  }
}
