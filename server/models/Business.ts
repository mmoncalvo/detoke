import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { emptyHours, type BusinessHours, type DeliveryOption, type PaymentMethod } from '../../shared/business.js';
import { BusinessCategory } from './BusinessCategory.js';
import { decimalColumn } from './decimal.js';
import { Product } from './Product.js';
import { User } from './User.js';

@Table({ tableName: 'businesses' })
export class Business extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @ForeignKey(() => User) @Column({ type: DataType.STRING, allowNull: false, unique: true }) ownerId!: string;
  @ForeignKey(() => BusinessCategory) @Column({ type: DataType.STRING, allowNull: false }) businessCategoryId!: string;

  @Column({ type: DataType.STRING, allowNull: false }) name!: string;
  @Column({ type: DataType.STRING, allowNull: false, unique: true }) slug!: string;
  @Column(DataType.STRING) tagline!: string | null;
  @Column(DataType.TEXT) description!: string | null;
  @Column(DataType.STRING) logo!: string | null;
  @Column(DataType.STRING) coverImage!: string | null;
  @Column({ type: DataType.JSON, allowNull: false, defaultValue: [] }) gallery!: string[];

  @Column({ type: DataType.STRING, allowNull: false }) whatsapp!: string;
  @Column(DataType.STRING) phone!: string | null;
  @Column(DataType.STRING) email!: string | null;
  @Column(DataType.STRING) website!: string | null;
  @Column(DataType.STRING) instagram!: string | null;
  @Column(DataType.STRING) facebook!: string | null;

  @Column(DataType.STRING) address!: string | null;
  @Column(DataType.STRING) neighborhood!: string | null;
  @Column(DataType.STRING) city!: string | null;
  @Column(decimalColumn('latitude', 10, 7)) latitude!: number | null;
  @Column(decimalColumn('longitude', 10, 7)) longitude!: number | null;

  @Column({ type: DataType.JSON, allowNull: false, defaultValue: emptyHours }) hours!: BusinessHours;
  @Column({ type: DataType.JSON, allowNull: false, defaultValue: ['pickup'] }) deliveryOptions!: DeliveryOption[];
  @Column(decimalColumn('deliveryFee')) deliveryFee!: number | null;
  @Column(decimalColumn('minimumOrder')) minimumOrder!: number | null;
  @Column(decimalColumn('deliveryRadiusKm', 5, 1)) deliveryRadiusKm!: number | null;
  @Column({ type: DataType.JSON, allowNull: false, defaultValue: ['cash'] }) paymentMethods!: PaymentMethod[];

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) isVerified!: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) isActive!: boolean;

  @BelongsTo(() => User, 'ownerId') owner?: User;
  @BelongsTo(() => BusinessCategory, 'businessCategoryId') category?: BusinessCategory;
  @HasMany(() => Product, { foreignKey: 'businessId', onDelete: 'CASCADE' }) products?: Product[];
}
