import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ProxyKey } from './keys.entity';

@Injectable()
export class KeysService {
  constructor(
    @InjectRepository(ProxyKey)
    private readonly keyRepo: Repository<ProxyKey>,
  ) {}

  async create(userId: string, label?: string): Promise<{ key: string; proxyKey: ProxyKey }> {
    const rawKey = 'ccproxy-' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const proxyKey = this.keyRepo.create({
      userId,
      keyHash,
      label: label || 'default',
    });

    const saved = await this.keyRepo.save(proxyKey);
    return { key: rawKey, proxyKey: saved };
  }

  async findAll(): Promise<ProxyKey[]> {
    return this.keyRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<ProxyKey[]> {
    return this.keyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string): Promise<void> {
    const key = await this.keyRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('Key not found');
    key.isActive = false;
    await this.keyRepo.save(key);
  }

  async remove(id: string): Promise<void> {
    const key = await this.keyRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('Key not found');
    await this.keyRepo.remove(key);
  }
}
