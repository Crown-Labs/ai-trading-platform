import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { AdminAuthMiddleware } from './auth/admin-auth.middleware';
import { UsersModule } from './users/users.module';
import { KeysModule } from './keys/keys.module';
import { ProxyModule } from './proxy/proxy.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { UsageModule } from './usage/usage.module';
import { User } from './users/users.entity';
import { ProxyKey } from './keys/keys.entity';
import { UsageLog } from './usage/usage.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.get<string>('database.url'),
        entities: [User, ProxyKey, UsageLog],
        synchronize: configService.get<string>('nodeEnv') === 'development',
        logging: configService.get<string>('nodeEnv') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    KeysModule,
    ProxyModule,
    RateLimitModule,
    UsageModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Admin endpoints require admin secret
    consumer
      .apply(AdminAuthMiddleware)
      .forRoutes(
        { path: 'admin/*path', method: RequestMethod.ALL },
      );

    // Proxy endpoints require proxy key auth
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'v1/messages', method: RequestMethod.POST },
      );
  }
}
