module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => require('crypto').randomUUID(),
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    categoryId: DataTypes.STRING,
    images: DataTypes.TEXT,
    userId: DataTypes.STRING
  });

  return Product;
};
