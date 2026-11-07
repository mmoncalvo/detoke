export default (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => crypto.randomUUID(),
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      unique: true
    },
    description: DataTypes.TEXT,
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    images: {
      type: DataTypes.TEXT,
      defaultValue: '[]'
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    destacado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    whatsapp: DataTypes.STRING,
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    categoryId: DataTypes.STRING,
    userId: DataTypes.STRING
  });
  
  return Product;
};
