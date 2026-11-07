import crypto from 'node:crypto';
import { Column, DataType, DefaultScope, HasOne, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Business } from './Business.js';

@DefaultScope(() => ({ attributes: { exclude: ['passwordHash'] } }))
@Table({ tableName: 'users' })
export class User extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) email!: string;
  @Column({ type: DataType.STRING, allowNull: false }) passwordHash!: string;
  @Column({ type: DataType.STRING, allowNull: false }) name!: string;
  @Column(DataType.STRING) phone!: string | null;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'seller' }) role!: 'seller' | 'admin';

  @HasOne(() => Business, 'ownerId') business?: Business;
}
