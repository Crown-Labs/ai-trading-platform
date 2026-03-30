import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { UsageService } from '../usage/usage.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';

@ApiTags('Proxy')
@ApiBearerAuth()
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(
    private readonly proxyService: ProxyService,
    private readonly rateLimitService: RateLimitService,
    private readonly usageService: UsageService,
  ) {}

  @Post('v1/messages')
  @ApiOperation({ summary: 'Proxy request to Anthropic Messages API' })
  async proxyMessages(@Req() req: Request, @Res() res: Response) {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    const proxyKey = authReq.proxyKey;

    if (!user || !proxyKey) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
      return;
    }

    // Rate limiting
    const rateLimitResult = await this.rateLimitService.checkAndIncrement(
      user.id,
      user.requestsPerMinute,
    );

    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);

    if (!rateLimitResult.allowed) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        type: 'error',
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded. Please try again later.',
        },
      });
      return;
    }

    const startTime = Date.now();
    const requestBody = req.body;
    const isStreaming = requestBody?.stream === true;
    const model = (requestBody?.model as string) || 'unknown';

    try {
      const proxyRes = await this.proxyService.forwardRequest(
        '/v1/messages',
        requestBody,
        req.headers as Record<string, string | string[] | undefined>,
      );

      // Forward response status code
      const statusCode = proxyRes.statusCode || 200;

      // Forward relevant headers from Anthropic
      const headersToForward = [
        'content-type',
        'x-request-id',
        'request-id',
        'anthropic-ratelimit-requests-limit',
        'anthropic-ratelimit-requests-remaining',
        'anthropic-ratelimit-requests-reset',
        'anthropic-ratelimit-tokens-limit',
        'anthropic-ratelimit-tokens-remaining',
        'anthropic-ratelimit-tokens-reset',
      ];

      for (const header of headersToForward) {
        const value = proxyRes.headers[header];
        if (value) {
          res.setHeader(header, value);
        }
      }

      if (isStreaming) {
        // SSE streaming response
        res.status(statusCode);
        res.setHeader('content-type', 'text/event-stream');
        res.setHeader('cache-control', 'no-cache');
        res.setHeader('connection', 'keep-alive');

        // Attach usage extraction listeners BEFORE piping
        const usagePromise = this.proxyService.extractUsageFromSSEStream(proxyRes, model);

        // Pipe the SSE stream directly to the client
        proxyRes.pipe(res);

        // Log usage asynchronously after stream ends
        usagePromise
          .then((usage) => {
            const durationMs = Date.now() - startTime;
            return this.usageService.logUsage({
              userId: user.id,
              keyId: proxyKey.id,
              model: usage.model,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              requestDurationMs: durationMs,
            });
          })
          .catch((err) => this.logger.error(`Failed to log usage: ${err.message}`));
      } else {
        // Non-streaming: collect full response body, extract usage, forward to client
        const { body, usage } = await this.proxyService.collectResponseBody(proxyRes, model);
        const durationMs = Date.now() - startTime;

        res.status(statusCode);
        // Ensure correct content-type for JSON
        if (!res.getHeader('content-type')) {
          res.setHeader('content-type', 'application/json');
        }
        res.send(body);

        // Log usage asynchronously
        this.usageService
          .logUsage({
            userId: user.id,
            keyId: proxyKey.id,
            model: usage.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            requestDurationMs: durationMs,
          })
          .catch((err) => this.logger.error(`Failed to log usage: ${err.message}`));
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Proxy error: ${errMsg}`);
      if (!res.headersSent) {
        res.status(HttpStatus.BAD_GATEWAY).json({
          type: 'error',
          error: {
            type: 'proxy_error',
            message: 'Failed to forward request to Anthropic API',
          },
        });
      }
    }
  }
}
