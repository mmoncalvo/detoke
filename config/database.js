require('dotenv').config();
const path = require('path');

const config = {
  development: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: path.join(process.cwd(), process.env.DB_STORAGE || 'database.sqlite'),
    logging: false
  },
  production: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    logging: false
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
