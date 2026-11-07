const fs = require('fs');

const users = JSON.parse(fs.readFileSync('seed/users.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('seed/products.json', 'utf8'));

// Mapa de rubros a imágenes
const rubros = {
  pizzeria: {
    cover: 'pizzeria_cover.jpg',
    logo: 'pizza-napo.jpg',
    keywords: ['pizza', 'fugazzeta', 'calzone']
  },
  carniceria: {
    cover: 'carniceria_cover.jpg',
    logo: 'asado.jpg',
    keywords: ['asado', 'hamburguesas', 'chorizo', 'milanesas']
  },
  dietetica: {
    cover: 'dietetica_cover.jpg',
    logo: 'almendras.jpg',
    keywords: ['almendras', 'granola', 'lentejas', 'harina']
  },
  panaderia: {
    cover: 'panaderia_cover.jpg',
    logo: 'medialunas.jpg',
    keywords: ['facturas', 'pan', 'medialunas']
  },
  verduleria: {
    cover: 'verduleria-cover.jpg',
    logo: 'lechuga.jpg',
    keywords: ['lechuga', 'manzanas', 'tomates', 'bananas']
  },
  almacen: {
    cover: 'almacen-cover.jpg',
    logo: 'aceite.jpg',
    keywords: ['aceite', 'arroz', 'leche', 'jugo', 'coca']
  }
};

const rubrosList = Object.keys(rubros);

// Actualizar usuarios
const updatedUsers = users.map((user, index) => {
  const rubroKey = rubrosList[index % rubrosList.length];
  const rubro = rubros[rubroKey];
  return {
    ...user,
    businessName: `${rubroKey.charAt(0).toUpperCase() + rubroKey.slice(1)} ${index}`,
    imagenPortada: rubro.cover,
    logo: rubro.logo,
    galeria: JSON.stringify([rubro.cover, rubro.logo, ...rubro.keywords.slice(0, 2).map(k => `${k}.jpg`)])
  };
});

// Actualizar productos
const updatedProducts = products.map(product => {
  const owner = updatedUsers.find(u => u.id === product.userId);
  // Intentar asignar imagen basada en nombre
  const foundImage = Object.values(rubros).flatMap(r => r.keywords).find(k => product.title.toLowerCase().includes(k));
  const image = foundImage ? `${foundImage}.jpg` : 'almacen-1.jpg';
  
  return {
    ...product,
    images: JSON.stringify([image])
  };
});

fs.writeFileSync('seed/users.json', JSON.stringify(updatedUsers, null, 2));
fs.writeFileSync('seed/products.json', JSON.stringify(updatedProducts, null, 2));
console.log('Seed actualizado semánticamente.');
