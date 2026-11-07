import { Sequelize } from 'sequelize';
import dbConfig from '../config/database.js';

const sequelize = new Sequelize(dbConfig);

import UserModel from './user.js';
import ProductModel from './product.js';
import CategoryModel from './category.js';

const User = UserModel(sequelize, Sequelize.DataTypes);
const Product = ProductModel(sequelize, Sequelize.DataTypes);
const Category = CategoryModel(sequelize, Sequelize.DataTypes);

User.hasMany(Product, { foreignKey: 'userId' });
Product.belongsTo(User, { foreignKey: 'userId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

export { sequelize, User, Product, Category };
