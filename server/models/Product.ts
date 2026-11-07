import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Category } from './Category.js';
import { User } from './User.js';

@Table({ tableName: 'Products' })
export class Product extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false }) title!: string;
  @Column({ type: DataType.STRING, unique: true }) slug!: string | null;
  @Column(DataType.TEXT) description!: string | null;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false }) price!: number;
  /** JSON: list of image paths. */
  @Column({ type: DataType.TEXT, defaultValue: '[]' }) images!: string;
  @Column({ type: DataType.INTEGER, defaultValue: 0 }) stock!: number;
  @Column({ type: DataType.BOOLEAN, defaultValue: false }) featured!: boolean;
  @Column(DataType.STRING) whatsapp!: string | null;
  @Column({ type: DataType.BOOLEAN, defaultValue: true }) isAvailable!: boolean;

  @ForeignKey(() => Category) @Column(DataType.STRING) categoryId!: string | null;
  @ForeignKey(() => User) @Column(DataType.STRING) userId!: string | null;

  // The property name is the JSON key: the web app reads `User` and `Category`.
  @BelongsTo(() => User, { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' }) User?: User;
  @BelongsTo(() => Category, { foreignKey: 'categoryId', onDelete: 'CASCADE', onUpdate: 'CASCADE' }) Category?: Category;
}
