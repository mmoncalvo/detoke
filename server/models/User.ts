import crypto from 'node:crypto';
import { Column, DataType, DefaultScope, HasOne, Model, PrimaryKey, Table } from 'sequelize-typescript';
import type { CartLine, UserRole } from '../../shared/types.js';
import { Business } from './Business.js';

@DefaultScope(() => ({ attributes: { exclude: ['passwordHash', 'googleId'] } }))
@Table({ tableName: 'users' })
export class User extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) email!: string;
  /** null for accounts that only sign in with Google. */
  @Column(DataType.STRING) passwordHash!: string | null;
  @Column({ type: DataType.STRING, unique: true }) googleId!: string | null;
  @Column(DataType.STRING) avatarUrl!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) name!: string;
  @Column(DataType.STRING) phone!: string | null;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'seller' }) role!: UserRole;
  /** Delivery address a customer reuses at checkout. */
  @Column(DataType.STRING) address!: string | null;
  /** The cart of a signed-in user, so it follows them across devices: [{ productId, quantity }]. */
  @Column(DataType.JSON) cart!: CartLine[] | null;
  /** Set when an admin disables a customer account: it can no longer sign in or order. */
  @Column(DataType.DATE) disabledAt!: Date | null;
  @Column(DataType.STRING) disabledReason!: string | null;

  @HasOne(() => Business, 'ownerId') business?: Business;
}
