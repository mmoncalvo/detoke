const fs = require('fs');
const path = 'seed/users.json';
const users = JSON.parse(fs.readFileSync(path, 'utf8'));

const logoImages = [
  "almacen-1.jpg", "asado.jpg", "bananas.jpg", "coca.jpg",
  "empanadas.jpg", "facturas.jpg", "fideos.jpg", "jabon.jpg", 
  "jugo.jpg", "leche.jpg", "lechuga.jpg", "manzanas.jpg"
];

const updatedUsers = users.map(user => ({
  ...user,
  logo: logoImages[Math.floor(Math.random() * logoImages.length)]
}));

fs.writeFileSync(path, JSON.stringify(updatedUsers, null, 2));
console.log('Logos asignados correctamente.');
