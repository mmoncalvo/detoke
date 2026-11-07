import crypto from 'node:crypto';
import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import type { ContactReason, ContactStatus } from '../../shared/contact.js';
import { User } from './User.js';

@Table({ tableName: 'contact_messages' })
export class ContactMessage extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false }) name!: string;
  @Column({ type: DataType.STRING, allowNull: false }) email!: string;
  @Column(DataType.STRING) phone!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) reason!: ContactReason;
  @Column(DataType.STRING) businessName!: string | null;
  @Column({ type: DataType.TEXT, allowNull: false }) message!: string;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'new' }) status!: ContactStatus;
  @Column(DataType.STRING) ip!: string | null;
  @Column(DataType.STRING(512)) userAgent!: string | null;

  @ForeignKey(() => User) @Column(DataType.STRING) userId!: string | null;
  @BelongsTo(() => User, { foreignKey: 'userId', onDelete: 'SET NULL' }) user?: User;
}
