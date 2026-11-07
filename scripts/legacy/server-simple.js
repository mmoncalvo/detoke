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

// Test route
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API funcionando' });
});

// Usuarios routes (simplified)
const usuarios = require('./routes/users.js');

app.use('/api/usuarios', usuarios);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
