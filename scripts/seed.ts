// npm run db:seed — borra la base de desarrollo y carga los datos de ejemplo.
import { sequelize } from '../server/db.js';
import { seed } from '../server/services/seed.js';

console.log('Datos de ejemplo cargados:', await seed());
await sequelize.close();
