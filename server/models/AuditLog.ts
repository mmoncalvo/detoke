import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { ImpersonationLog } from './ImpersonationLog.js';
import { User } from './User.js';

/** A write made by an admin while acting on behalf of another user. */
@Table({ tableName: 'audit_logs', updatedAt: false })
export class AuditLog extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @ForeignKey(() => ImpersonationLog) @Column({ type: DataType.STRING, allowNull: false }) impersonationLogId!: string;
  @ForeignKey(() => User) @Column({ type: DataType.STRING, allowNull: false }) adminId!: string;
  @ForeignKey(() => User) @Column({ type: DataType.STRING, allowNull: false }) targetUserId!: string;
  @Column({ type: DataType.STRING, allowNull: false }) method!: string;
  @Column({ type: DataType.STRING, allowNull: false }) path!: string;
  @Column(DataType.INTEGER) status!: number | null;

  @BelongsTo(() => ImpersonationLog, 'impersonationLogId') impersonation?: ImpersonationLog;
}
