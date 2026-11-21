import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { User } from './User.js';
import { PushOrderFollow } from './PushOrderFollow.js';

/**
 * A browser (or phone) that accepted system notifications. It belongs to a user while that user is
 * signed in there (new orders of their business, status of the orders they placed), and follows
 * the orders placed from it without an account through PushOrderFollow.
 */
@Table({ tableName: 'push_subscriptions' })
export class PushSubscription extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  /** Address of the browser's push service; unique per browser profile. */
  @Column({ type: DataType.STRING(1024), allowNull: false, unique: true }) endpoint!: string;
  @Column({ type: DataType.STRING, allowNull: false }) p256dh!: string;
  @Column({ type: DataType.STRING, allowNull: false }) auth!: string;

  @ForeignKey(() => User) @Column(DataType.STRING) userId!: string | null;
  @BelongsTo(() => User, { foreignKey: 'userId', onDelete: 'CASCADE' }) user?: User;

  @HasMany(() => PushOrderFollow, { foreignKey: 'subscriptionId', onDelete: 'CASCADE' }) follows?: PushOrderFollow[];
}
