import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  private readonly adminSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.adminSecret = this.configService.get<string>('adminSecret', '');
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    if (!this.adminSecret || token !== this.adminSecret) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    next();
  }
}
