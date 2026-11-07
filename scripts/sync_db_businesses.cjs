const fs = require('fs');

const usersPath = 'seed/users.json';
const imagesDir = 'data/images';

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const files = fs.readdirSync(imagesDir);

const updatedUsers = users.map(user => {
    const slug = user.slug;
    
    // Buscar archivos que coincidan con el slug del negocio
    const logoFile = files.find(f => f.startsWith(`${slug}_logo`));
    const coverFile = files.find(f => f.startsWith(`${slug}_cover`));
    
    return {
        ...user,
        logo: logoFile || user.logo,
        imagenPortada: coverFile || user.imagenPortada,
        galeria: JSON.stringify([coverFile || user.imagenPortada, logoFile || user.logo].filter(Boolean))
    };
});

fs.writeFileSync(usersPath, JSON.stringify(updatedUsers, null, 2));
console.log('Sincronización de imágenes de negocios finalizada.');
