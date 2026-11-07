import crypto from 'node:crypto';
import { Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Product } from './Product.js';

@Table({ tableName: 'Users' })
export class User extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) username!: string;
  @Column({ type: DataType.STRING, allowNull: false }) password!: string;
  @Column({ type: DataType.STRING, defaultValue: 'seller' }) role!: string;
  @Column(DataType.STRING) fullName!: string | null;
  @Column(DataType.STRING) email!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) businessName!: string;
  @Column({ type: DataType.STRING, unique: true }) slug!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) whatsapp!: string;
  @Column(DataType.TEXT) description!: string | null;
  @Column(DataType.STRING) logo!: string | null;
  @Column(DataType.STRING) coverImage!: string | null;
  @Column(DataType.STRING) address!: string | null;
  @Column(DataType.DECIMAL(10, 8)) latitude!: number | null;
  @Column(DataType.DECIMAL(11, 8)) longitude!: number | null;
  /** JSON: {"monday": "09:00-18:00", "sunday": "closed", ...} */
  @Column(DataType.TEXT) hours!: string | null;
  /** JSON: list of URLs. */
  @Column(DataType.TEXT) gallery!: string | null;
  @Column(DataType.STRING) website!: string | null;
  @Column({ type: DataType.BOOLEAN, defaultValue: false }) isVerified!: boolean;
  @Column({ type: DataType.BOOLEAN, defaultValue: true }) isActive!: boolean;

  // The property name is the JSON key: the web app reads `Products`.
  @HasMany(() => Product, { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' }) Products!: Product[];
}
