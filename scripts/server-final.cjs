const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const app = express();
const PORT = 3000;

app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use('/data', express.static(path.join(process.cwd(), 'data')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== USUARIOS (negocios) =====

// Listar usuarios activos
app.get('/api/usuarios', async (req, res) => {
  try {
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(process.cwd(), 'database.sqlite'),
      logging: false
    });
    
    const User = sequelize.define('User', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      businessName: DataTypes.STRING,
      slug: { type: DataTypes.STRING, unique: true },
      description: DataTypes.TEXT,
      whatsapp: DataTypes.STRING,
      imagenPortada: DataTypes.STRING,
      estaVerificado: { type: DataTypes.BOOLEAN, defaultValue: false }
    });
    
    await sequelize.authenticate();
    
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'slug', 'businessName', 'description', 'imagenPortada', 'whatsapp', 'estaVerificado'],
      order: [['businessName', 'ASC']]
    });
    
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Usuario por SLUG (debe ir ANTES de /:id)
app.get('/api/usuarios/slug/:slug', async (req, res) => {
  try {
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(process.cwd(), 'database.sqlite'),
      logging: false
    });
    
    const User = sequelize.define('User', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      slug: DataTypes.STRING,
      businessName: DataTypes.STRING,
      description: DataTypes.TEXT,
      whatsapp: DataTypes.STRING,
      imagenPortada: DataTypes.STRING,
      address: DataTypes.STRING,
      latitud: DataTypes.DECIMAL(10, 8),
      longitud: DataTypes.DECIMAL(11, 8),
      horario: DataTypes.TEXT,
      galeria: DataTypes.TEXT,
      estaVerificado: { type: DataTypes.BOOLEAN, defaultValue: false }
    });
    
    await sequelize.authenticate();
    
    const user = await User.findOne({
      where: { slug: req.params.slug, isActive: true }
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
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(process.cwd(), 'database.sqlite'),
      logging: false
    });
    
    const User = sequelize.define('User', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      businessName: DataTypes.STRING
    });
    
    await sequelize.authenticate();
    
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Productos de un usuario
app.get('/api/usuarios/:id/productos', async (req, res) => {
  try {
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(process.cwd(), 'database.sqlite'),
      logging: false
    });
    
    const Product = sequelize.define('Product', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      title: DataTypes.STRING,
      price: DataTypes.DECIMAL(10, 2),
      images: DataTypes.TEXT,
      isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
      userId: DataTypes.STRING
    });
    
    await sequelize.authenticate();
    
    const products = await Product.findAll({
      where: { userId: req.params.id, isAvailable: true }
    });
    
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ===== PRODUCTOS =====

app.get('/api/productos', async (req, res) => {
  try {
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(process.cwd(), 'database.sqlite'),
      logging: false
    });
    
    const Product = sequelize.define('Product', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      title: DataTypes.STRING,
      price: DataTypes.DECIMAL(10, 2),
      images: DataTypes.TEXT,
      isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
      userId: DataTypes.STRING
    });
    
    const User = sequelize.define('User', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      businessName: DataTypes.STRING,
      slug: DataTypes.STRING,
      whatsapp: DataTypes.STRING
    });
    
    Product.belongsTo(User, { foreignKey: 'userId' });
    
    await sequelize.authenticate();
    
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

// ===== CATEGORIAS =====

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

// ===== AUTH (simplificado) =====

app.post('/api/auth/login', async (req, res) => {
  try {
    const { Sequelize, DataTypes } = require('sequelize');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(process.cwd(), 'database.sqlite'),
      logging: false
    });
    
    const User = sequelize.define('User', {
      id: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomUUID(), primaryKey: true },
      username: DataTypes.STRING,
      password: DataTypes.STRING,
      businessName: DataTypes.STRING
    });
    
    await sequelize.authenticate();
    
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
