export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => crypto.randomUUID(),
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'vendedor'
    },
    fullName: DataTypes.STRING,
    email: DataTypes.STRING,
    businessName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      unique: true
    },
    whatsapp: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    logo: DataTypes.STRING,
    imagenPortada: DataTypes.STRING,
    address: DataTypes.STRING,
    latitud: DataTypes.DECIMAL(10, 8),
    longitud: DataTypes.DECIMAL(11, 8),
    horario: DataTypes.TEXT, // JSON: {"lunes": "09:00-18:00", ...}
    galeria: DataTypes.TEXT, // JSON array de URLs
    sitioWeb: DataTypes.STRING,
    estaVerificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });
  
  return User;
};
