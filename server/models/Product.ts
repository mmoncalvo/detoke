import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Business } from './Business.js';
import { decimalColumn } from './decimal.js';
import { ProductCategory } from './ProductCategory.js';

@Table({ tableName: 'products' })
export class Product extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @ForeignKey(() => Business) @Column({ type: DataType.STRING, allowNull: false }) businessId!: string;
  @ForeignKey(() => ProductCategory) @Column(DataType.STRING) productCategoryId!: string | null;

  @Column({ type: DataType.STRING, allowNull: false }) name!: string;
  @Column({ type: DataType.STRING, allowNull: false, unique: true }) slug!: string;
  @Column(DataType.TEXT) description!: string | null;
  @Column(decimalColumn('price', 12, 2, false)) price!: number;
  @Column(decimalColumn('compareAtPrice')) compareAtPrice!: number | null;
  @Column({ type: DataType.JSON, allowNull: false, defaultValue: [] }) images!: string[];
  /** null means stock is not tracked. */
  @Column(DataType.INTEGER) stock!: number | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) isAvailable!: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) featured!: boolean;

  @BelongsTo(() => Business, { foreignKey: 'businessId', onDelete: 'CASCADE' }) business?: Business;
  @BelongsTo(() => ProductCategory, 'productCategoryId') category?: ProductCategory;
}
