import { DataType } from 'sequelize-typescript';
import type { Model } from 'sequelize-typescript';

/** DECIMAL column that reads as a number (Postgres returns strings). */
export function decimalColumn(name: string, precision = 12, scale = 2, allowNull = true) {
  return {
    type: DataType.DECIMAL(precision, scale),
    allowNull,
    get(this: Model) {
      const value = this.getDataValue(name);
      return value == null ? null : Number(value);
    },
  };
}
