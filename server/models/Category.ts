import crypto from 'node:crypto';
import { Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Product } from './Product.js';

@Table({ tableName: 'Categories' })
export class Category extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) name!: string;
  @Column(DataType.STRING) icon!: string | null;
  @Column({ type: DataType.BOOLEAN, defaultValue: true }) isActive!: boolean;

  @HasMany(() => Product, { foreignKey: 'categoryId', onDelete: 'CASCADE', onUpdate: 'CASCADE' }) Products!: Product[];
}
