import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { MarketDataModule } from './market-data/market-data.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { BacktestModule } from './backtest/backtest.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ChatModule,
    MarketDataModule,
    IndicatorsModule,
    BacktestModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
