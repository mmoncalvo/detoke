import crypto from 'node:crypto';
import { Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Product } from './Product.js';

@Table({ tableName: 'product_categories' })
export class ProductCategory extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) name!: string;
  @Column({ type: DataType.STRING, allowNull: false, unique: true }) slug!: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 }) position!: number;

  @HasMany(() => Product, 'productCategoryId') products?: Product[];
}
