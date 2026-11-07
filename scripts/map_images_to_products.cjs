const fs = require('fs');

const products = JSON.parse(fs.readFileSync('seed/products.json', 'utf8'));

// Mapa para asegurar que el nombre de archivo generado en el script de python coincida con el seed
const updatedProducts = products.map(product => {
    const filename = `${product.title.toLowerCase().replace(' ', '_')}.jpg`;
    // Verificamos si existe en data/images
    const exists = fs.existsSync(`data/images/${filename}`);
    const image = exists ? filename : 'almacen-1.jpg';
    
    return {
        ...product,
        images: JSON.stringify([image])
    };
});

fs.writeFileSync('seed/products.json', JSON.stringify(updatedProducts, null, 2));
console.log('Seed de productos actualizado con imágenes precisas.');
