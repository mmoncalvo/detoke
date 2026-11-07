const fs = require('fs');
const path = 'seed/users.json';
const users = JSON.parse(fs.readFileSync(path, 'utf8'));

// Lista de imágenes disponibles (basada en el directorio data/images)
const allImages = [
  "almacen-1.jpg", "almacen-2.jpg", "asado.jpg", "bananas.jpg", "coca.jpg",
  "empanadas.jpg", "facturas.jpg", "fideos.jpg", "hamburguesas-carne.jpg",
  "jabon.jpg", "jugo.jpg", "leche.jpg", "lechuga.jpg", "lentejas.jpg",
  "manzanas.jpg", "medialunas.jpg", "milanesas.jpg", "pan-frances.jpg", "papel.jpg"
];

const getRandomImages = (min, max) => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...allImages].sort(() => 0.5 - Math.random());
  return JSON.stringify(shuffled.slice(0, count));
};

const updatedUsers = users.map(user => ({
  ...user,
  galeria: getRandomImages(3, 5)
}));

fs.writeFileSync(path, JSON.stringify(updatedUsers, null, 2));
console.log('Galerías actualizadas correctamente.');
