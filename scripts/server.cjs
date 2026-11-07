const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');

dotenv.config({ quiet: true });

// Database
const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE ? path.join(process.cwd(), process.env.DB_STORAGE) : path.join(process.cwd(), 'database.sqlite'),
  logging: false
});

// Models
const User = sequelize.define('User', {
  id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  businessName: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true },
  whatsapp: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  logo: DataTypes.STRING,
  imagenPortada: DataTypes.STRING,
  address: DataTypes.STRING,
  latitud: DataTypes.DECIMAL(10, 8),
  longitud: DataTypes.DECIMAL(11, 8),
  horario: DataTypes.TEXT,
  galeria: DataTypes.TEXT,
  estaVerificado: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true },
  description: DataTypes.TEXT,
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  images: { type: DataTypes.TEXT, defaultValue: '[]' },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  destacado: { type: DataTypes.BOOLEAN, defaultValue: false },
  whatsapp: DataTypes.STRING,
  isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
  categoryId: DataTypes.STRING,
  userId: DataTypes.STRING
});

User.hasMany(Product, { foreignKey: 'userId' });
Product.belongsTo(User, { foreignKey: 'userId' });

// App
const app = express();
const PORT = 3000;

app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use('/data', express.static(path.join(process.cwd(), 'data')));

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    
    const userData = user.toJSON();
    delete userData.password;
    
    res.json({ success: true, data: { token, user: userData } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });
    
    const userData = user.toJSON();
    delete userData.password;
    res.json({ success: true, data: userData });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token inválido' });
  }
});

// Usuarios - Productos de una empresa (debe ir ANTES de /:id)
app.get('/api/usuarios/:id/products', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { userId: req.params.id, isAvailable: true },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Usuario por slug
app.get('/api/usuarios/slug/:slug', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { slug: req.params.slug, isActive: true },
      include: [{ model: Product, where: { isAvailable: true }, required: false }]
    });
    if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, isActive: true },
      include: [{ model: Product, where: { isAvailable: true }, required: false }]
    });
    if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Productos
app.get('/api/productos', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isAvailable: true },
      include: [{ model: User, attributes: ['id', 'businessName', 'slug', 'whatsapp'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Categorias (simplified)
app.get('/api/categorias', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'cat-1', name: 'Comidas', icon: '🍕' },
      { id: 'cat-2', name: 'Almacén', icon: '🛒' },
      { id: 'cat-3', name: 'Bebidas', icon: '🥤' },
      { id: 'cat-4', name: 'Panadería', icon: '🍞' },
      { id: 'cat-5', name: 'Carnicería', icon: '🥩' },
      { id: 'cat-6', name: 'Frutas y Verduras', icon: '🥬' },
      { id: 'cat-7', name: 'Lácteos', icon: '🧀' },
      { id: 'cat-8', name: 'Otros', icon: '📦' }
    ]
  });
});

// Start
const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
};

start();
