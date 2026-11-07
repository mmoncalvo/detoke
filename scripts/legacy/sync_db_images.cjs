const fs = require('fs');
const path = require('path');

const productsPath = 'seed/products.json';
const imagesDir = 'data/images';

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const files = fs.readdirSync(imagesDir);

const updatedProducts = products.map(product => {
    // Normalizar título para buscar coincidencia
    const title = product.title.toLowerCase().replace(/ /g, '_');
    
    // Buscar archivo que empiece con el título (ej: "milanesa_de_soja.jpg")
    const foundFile = files.find(f => f.startsWith(title) || f.includes(title));
    
    const image = foundFile ? foundFile : 'almacen-1.jpg';
    
    return {
        ...product,
        images: JSON.stringify([image])
    };
});

fs.writeFileSync(productsPath, JSON.stringify(updatedProducts, null, 2));
console.log('Sincronización de imágenes finalizada.');
