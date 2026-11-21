import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

/** Values the server generates once and keeps (the push notification keys, for example). */
@Table({ tableName: 'app_settings' })
export class AppSetting extends Model {
  @PrimaryKey @Column(DataType.STRING) key!: string;
  @Column({ type: DataType.TEXT, allowNull: false }) value!: string;
}
