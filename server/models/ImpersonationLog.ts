import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { AuditLog } from './AuditLog.js';
import { User } from './User.js';

/** An admin acting on behalf of another user. */
@Table({ tableName: 'impersonation_logs', updatedAt: false })
export class ImpersonationLog extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @ForeignKey(() => User) @Column({ type: DataType.STRING, allowNull: false }) adminId!: string;
  @ForeignKey(() => User) @Column({ type: DataType.STRING, allowNull: false }) targetUserId!: string;
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW }) startedAt!: Date;
  @Column(DataType.DATE) endedAt!: Date | null;
  @Column(DataType.STRING) ip!: string | null;
  @Column(DataType.STRING(512)) userAgent!: string | null;

  @BelongsTo(() => User, 'adminId') admin?: User;
  @BelongsTo(() => User, 'targetUserId') target?: User;
  @HasMany(() => AuditLog, 'impersonationLogId') actions?: AuditLog[];
}
