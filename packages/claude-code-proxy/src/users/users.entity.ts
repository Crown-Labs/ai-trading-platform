import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProxyKey } from '../keys/keys.entity';
import { UsageLog } from '../usage/usage.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 20 })
  requestsPerMinute!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ProxyKey, (key) => key.user)
  proxyKeys!: ProxyKey[];

  @OneToMany(() => UsageLog, (log) => log.user)
  usageLogs!: UsageLog[];
}
