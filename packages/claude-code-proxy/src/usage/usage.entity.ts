import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { ProxyKey } from '../keys/keys.entity';

@Entity('usage_logs')
export class UsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.usageLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'key_id' })
  keyId!: string;

  @ManyToOne(() => ProxyKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'key_id' })
  proxyKey!: ProxyKey;

  @Column()
  model!: string;

  @Column({ name: 'input_tokens', default: 0 })
  inputTokens!: number;

  @Column({ name: 'output_tokens', default: 0 })
  outputTokens!: number;

  @Column({
    name: 'estimated_cost_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  estimatedCostUsd!: number;

  @Column({ name: 'request_duration_ms', default: 0 })
  requestDurationMs!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
