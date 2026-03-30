import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyKey } from './keys.entity';
import { KeysService } from './keys.service';
import { KeysController } from './keys.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProxyKey])],
  controllers: [KeysController],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
