import crypto from 'node:crypto';
import { Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Product } from './Product.js';

@Table({ tableName: 'Users' })
export class User extends Model {
  @PrimaryKey @Column({ type: DataType.STRING, defaultValue: () => crypto.randomUUID() }) id!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true }) username!: string;
  @Column({ type: DataType.STRING, allowNull: false }) password!: string;
  @Column({ type: DataType.STRING, defaultValue: 'vendedor' }) role!: string;
  @Column(DataType.STRING) fullName!: string | null;
  @Column(DataType.STRING) email!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) businessName!: string;
  @Column({ type: DataType.STRING, unique: true }) slug!: string | null;
  @Column({ type: DataType.STRING, allowNull: false }) whatsapp!: string;
  @Column(DataType.TEXT) description!: string | null;
  @Column(DataType.STRING) logo!: string | null;
  @Column(DataType.STRING) imagenPortada!: string | null;
  @Column(DataType.STRING) address!: string | null;
  @Column(DataType.DECIMAL(10, 8)) latitud!: number | null;
  @Column(DataType.DECIMAL(11, 8)) longitud!: number | null;
  /** JSON: {"lunes": "09:00-18:00", ...} */
  @Column(DataType.TEXT) horario!: string | null;
  /** JSON: lista de URLs. */
  @Column(DataType.TEXT) galeria!: string | null;
  @Column(DataType.STRING) sitioWeb!: string | null;
  @Column({ type: DataType.BOOLEAN, defaultValue: false }) estaVerificado!: boolean;
  @Column({ type: DataType.BOOLEAN, defaultValue: true }) isActive!: boolean;

  // El nombre de la propiedad es la clave en el JSON: la web lee `Products`.
  @HasMany(() => Product, { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' }) Products!: Product[];
}
