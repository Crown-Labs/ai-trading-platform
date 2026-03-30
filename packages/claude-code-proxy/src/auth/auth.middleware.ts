import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ProxyKey } from '../keys/keys.entity';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    requestsPerMinute: number;
  };
  proxyKey?: {
    id: string;
    userId: string;
    label: string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(ProxyKey)
    private readonly proxyKeyRepo: Repository<ProxyKey>,
  ) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    const proxyKey = await this.proxyKeyRepo.findOne({
      where: { keyHash, isActive: true },
      relations: ['user'],
    });

    if (!proxyKey) {
      throw new UnauthorizedException('Invalid or revoked proxy key');
    }

    if (!proxyKey.user || !proxyKey.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Update lastUsedAt asynchronously (fire-and-forget)
    this.proxyKeyRepo.update(proxyKey.id, { lastUsedAt: new Date() }).catch(() => {});

    req.user = {
      id: proxyKey.user.id,
      email: proxyKey.user.email,
      name: proxyKey.user.name,
      isActive: proxyKey.user.isActive,
      requestsPerMinute: proxyKey.user.requestsPerMinute,
    };
    req.proxyKey = {
      id: proxyKey.id,
      userId: proxyKey.userId,
      label: proxyKey.label,
    };

    next();
  }
}
