import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyKey } from '../keys/keys.entity';
import { AuthMiddleware } from './auth.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([ProxyKey])],
  providers: [AuthMiddleware],
  exports: [AuthMiddleware, TypeOrmModule],
})
export class AuthModule {}
