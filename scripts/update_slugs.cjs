const fs = require('fs');
const path = 'seed/users.json';
const users = JSON.parse(fs.readFileSync(path, 'utf8'));

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
};

const updatedUsers = users.map(user => ({
  ...user,
  slug: slugify(user.businessName)
}));

fs.writeFileSync(path, JSON.stringify(updatedUsers, null, 2));
console.log('Slugs actualizados correctamente.');
