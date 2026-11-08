import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import type { DeliveryOption, PaymentMethod } from '../../shared/business.js';
import type { OrderHistoryEntry, OrderItem, OrderStatus } from '../../shared/orders.js';
import { Business } from './Business.js';
import { decimalColumn } from './decimal.js';

@Table({ tableName: 'orders' })
export class Order extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  /** Unguessable code in the public link: whoever has it can follow the order. */
  @Column({ type: DataType.STRING, allowNull: false, unique: true }) publicCode!: string;
  /** Per business, for people: "Pedido #12". */
  @Column({ type: DataType.INTEGER, allowNull: false }) number!: number;

  @ForeignKey(() => Business) @Column({ type: DataType.STRING, allowNull: false }) businessId!: string;

  @Column({ type: DataType.JSON, allowNull: false }) items!: OrderItem[];
  @Column(decimalColumn('subtotal', 12, 2, false)) subtotal!: number;
  @Column(decimalColumn('deliveryFee', 12, 2, false)) deliveryFee!: number;
  @Column(decimalColumn('total', 12, 2, false)) total!: number;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'ARS' }) currency!: string;

  @Column({ type: DataType.STRING, allowNull: false }) fulfillment!: DeliveryOption;
  @Column(DataType.STRING) deliveryAddress!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) paymentMethod!: PaymentMethod;
  @Column({ type: DataType.STRING, allowNull: false }) customerName!: string;
  @Column(DataType.STRING) customerPhone!: string | null;
  @Column(DataType.TEXT) notes!: string | null;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'pending' }) status!: OrderStatus;
  @Column({ type: DataType.JSON, allowNull: false, defaultValue: [] }) statusHistory!: OrderHistoryEntry[];

  @BelongsTo(() => Business, { foreignKey: 'businessId', onDelete: 'CASCADE' }) business?: Business;
}
