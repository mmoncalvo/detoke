import crypto from 'node:crypto';
import { Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Business } from './Business.js';

@Table({ tableName: 'business_categories' })
export class BusinessCategory extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) name!: string;
  @Column({ type: DataType.STRING, allowNull: false, unique: true }) slug!: string;
  @Column({ type: DataType.STRING, allowNull: false }) icon!: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 }) position!: number;

  @HasMany(() => Business, 'businessCategoryId') businesses?: Business[];
}
