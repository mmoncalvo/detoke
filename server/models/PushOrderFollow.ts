import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { PushSubscription } from './PushSubscription.js';

/** An order a browser asked to hear about, by its public code (orders placed without an account). */
@Table({ tableName: 'push_order_follows', indexes: [{ unique: true, fields: ['subscription_id', 'order_code'] }, { fields: ['order_code'] }] })
export class PushOrderFollow extends Model {
  @ForeignKey(() => PushSubscription) @Column({ type: DataType.STRING, allowNull: false }) subscriptionId!: string;
  @BelongsTo(() => PushSubscription, { foreignKey: 'subscriptionId', onDelete: 'CASCADE' }) subscription?: PushSubscription;

  @Column({ type: DataType.STRING, allowNull: false }) orderCode!: string;
}
