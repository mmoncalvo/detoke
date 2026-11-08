import crypto from 'node:crypto';
import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

/** What an admin did on their own (not on behalf of someone): disabling, enabling or deleting a business. */
@Table({ tableName: 'admin_actions', updatedAt: false })
export class AdminAction extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;
  @Column({ type: DataType.STRING, allowNull: false }) adminId!: string;
  @Column({ type: DataType.STRING, allowNull: false }) action!: 'business.disable' | 'business.enable' | 'business.delete' | 'user.disable' | 'user.enable' | 'user.delete';
  /** Kept as plain values: the account may no longer exist. */
  @Column(DataType.STRING) targetUserId!: string | null;
  @Column(DataType.STRING) targetBusinessId!: string | null;
  @Column(DataType.JSON) details!: Record<string, unknown> | null;
}
