const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const sequelize = new Sequelize(dbConfig);

const User = require('./user')(sequelize, Sequelize.DataTypes);
const Product = require('./product')(sequelize, Sequelize.DataTypes);

User.hasMany(Product);
Product.belongsTo(User);

module.exports = { sequelize, User, Product };
