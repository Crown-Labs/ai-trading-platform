import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UsageLog } from './usage.entity';

// Cost per million tokens (USD) by model prefix
const COST_TABLE: Record<string, { input: number; output: number }> = {
  'claude-sonnet': { input: 3, output: 15 },
  'claude-opus': { input: 15, output: 75 },
  'claude-haiku': { input: 0.25, output: 1.25 },
  default: { input: 3, output: 15 },
};

function getCostRates(model: string): { input: number; output: number } {
  for (const [prefix, rates] of Object.entries(COST_TABLE)) {
    if (prefix !== 'default' && model.includes(prefix)) {
      return rates;
    }
  }
  return COST_TABLE['default'];
}

export interface LogUsageParams {
  userId: string;
  keyId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestDurationMs: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectRepository(UsageLog)
    private readonly usageRepo: Repository<UsageLog>,
  ) {}

  async logUsage(params: LogUsageParams): Promise<void> {
    const rates = getCostRates(params.model);
    const estimatedCostUsd =
      (params.inputTokens / 1_000_000) * rates.input +
      (params.outputTokens / 1_000_000) * rates.output;

    const log = this.usageRepo.create({
      userId: params.userId,
      keyId: params.keyId,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      estimatedCostUsd: parseFloat(estimatedCostUsd.toFixed(6)),
      requestDurationMs: params.requestDurationMs,
    });

    try {
      await this.usageRepo.save(log);
    } catch (err) {
      this.logger.error(`Failed to save usage log: ${err}`);
    }
  }

  async getUsageByUser(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<UsageLog[]> {
    const where: Record<string, unknown> = { userId };
    if (from && to) {
      where['createdAt'] = Between(from, to);
    }
    return this.usageRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 1000,
    });
  }

  async getUsageSummary(
    userId?: string,
    from?: Date,
    to?: Date,
  ): Promise<{
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
  }> {
    const qb = this.usageRepo.createQueryBuilder('usage');
    qb.select('COUNT(*)', 'totalRequests');
    qb.addSelect('COALESCE(SUM(usage.input_tokens), 0)', 'totalInputTokens');
    qb.addSelect('COALESCE(SUM(usage.output_tokens), 0)', 'totalOutputTokens');
    qb.addSelect('COALESCE(SUM(usage.estimated_cost_usd), 0)', 'totalCostUsd');

    if (userId) {
      qb.where('usage.user_id = :userId', { userId });
    }
    if (from && to) {
      qb.andWhere('usage.created_at BETWEEN :from AND :to', { from, to });
    }

    const result = await qb.getRawOne();
    return {
      totalRequests: parseInt(result?.totalRequests || '0', 10),
      totalInputTokens: parseInt(result?.totalInputTokens || '0', 10),
      totalOutputTokens: parseInt(result?.totalOutputTokens || '0', 10),
      totalCostUsd: parseFloat(result?.totalCostUsd || '0'),
    };
  }
}
