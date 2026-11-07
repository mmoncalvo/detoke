const fs = require('fs');
const path = 'seed/users.json';
const users = JSON.parse(fs.readFileSync(path, 'utf8'));

const newPhone = "59899760994";

const updatedUsers = users.map(user => ({
  ...user,
  whatsapp: newPhone
}));

fs.writeFileSync(path, JSON.stringify(updatedUsers, null, 2));
console.log(`Números de WhatsApp actualizados a ${newPhone} en ${updatedUsers.length} registros.`);
