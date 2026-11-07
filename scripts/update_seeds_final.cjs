const fs = require('fs');

const users = JSON.parse(fs.readFileSync('seed/users.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('seed/products.json', 'utf8'));

// Mapa de rubros real y profesional con imágenes de alta calidad
const rubros = {
  pizzeria: {
    cover: 'pizzeria_cover.jpg',
    logo: 'pizza-mozza.jpg',
    keywords: ['pizza', 'fugazzeta', 'calzone', 'napolitana']
  },
  carniceria: {
    cover: 'carniceria_cover.jpg',
    logo: 'asado.jpg',
    keywords: ['asado', 'hamburguesas', 'chorizo', 'milanesas']
  },
  dietetica: {
    cover: 'dietetica_cover.jpg',
    logo: 'almendras.jpg',
    keywords: ['almendras', 'granola', 'lentejas', 'chia', 'stevia']
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

// Imágenes seguras (omitir las de 29 bytes que son rotas)
const isImageValid = (filename) => {
  if (!filename || filename.endsWith('.svg')) return false;
  const stats = fs.statSync(`data/images/${filename}`);
  return stats.size > 1000; // Omitir archivos < 1KB (probables errores de descarga)
};

const updatedUsers = users.map((user, index) => {
  const rubroKey = rubrosList[index % rubrosList.length];
  const rubro = rubros[rubroKey];
  
  const businessNames = {
    pizzeria: ['Don Juan Pizzería', 'La Napolitana', 'Pizzería el Sol'],
    carniceria: ['Carnes Argentinas', 'El Gaucho', 'La Estancia'],
    dietetica: ['Vida Sana', 'Almacén Natural', 'Nutrición Total'],
    panaderia: ['El Horno de Oro', 'La Dulce Espiga', 'Panadería Artesanal'],
    verduleria: ['Frutas & Verduras Frescas', 'El Vergel', 'Mercado Natural'],
    almacen: ['Almacén del Barrio', 'Tu Despensa', 'Mercadito Express']
  };
  
  const names = businessNames[rubroKey];
  return {
    ...user,
    businessName: names[index % names.length] + (index > 2 ? ` ${index}` : ''),
    imagenPortada: isImageValid(rubro.cover) ? rubro.cover : 'almacen-cover.jpg',
    logo: isImageValid(rubro.logo) ? rubro.logo : 'almacen-1.jpg',
    galeria: JSON.stringify([rubro.cover, rubro.logo].filter(isImageValid))
  };
});

const updatedProducts = products.map(product => {
  const owner = updatedUsers.find(u => u.id === product.userId);
  let image = 'almacen-1.jpg';

  if (owner) {
    const rubroKey = rubrosList[updatedUsers.indexOf(owner) % rubrosList.length];
    const rubro = rubros[rubroKey];
    
    // Buscar keyword exacta en el título
    const foundKeyword = rubro.keywords.find(k => product.title.toLowerCase().includes(k));
    const potentialImage = foundKeyword ? `${foundKeyword}.jpg` : `${rubro.keywords[0]}.jpg`;
    
    if (isImageValid(potentialImage)) {
        image = potentialImage;
    }
  }
  
  return {
    ...product,
    images: JSON.stringify([image])
  };
});

fs.writeFileSync('seed/users.json', JSON.stringify(updatedUsers, null, 2));
fs.writeFileSync('seed/products.json', JSON.stringify(updatedProducts, null, 2));
console.log('Seed profesional aplicado con validación de imágenes.');
