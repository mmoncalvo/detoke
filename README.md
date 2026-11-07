# Detoke - Marketplace Multimarca

Sistema de marketplace para vendedores de comida, almacén y diversas categorías. Cada negocio tiene su propia landing page con información, mapa, galería de imágenes y productos.

## Características

- ✅ **Multimarca**: Cada negocio tiene su propia página (`/negocio/:slug`)
- ✅ **Landing pages**: Portada, logo, descripción, horarios, mapa, galería
- ✅ **Productos**: Gestión completa con imágenes, stock, categorías
- ✅ **WhatsApp**: Botones de contacto directo en productos y negocios
- ✅ **Mapas**: Integración con Leaflet para ubicación de negocios
- ✅ **Autenticación**: JWT para vendedores
- ✅ **Dashboard**: Gestión de productos para cada negocio

## Tecnologías

**Backend:**
- Node.js + Express
- JavaScript (CommonJS)
- Sequelize ORM + SQLite
- JWT para autenticación
- Multer para subida de imágenes

**Frontend:**
- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Leaflet.js para mapas
- React Router DOM v7

## Instalación

```bash
# Clonar/Entrar al proyecto
cd /opt/homebrew/var/www/detoke

# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd client && npm install && cd ..
```

## Configuración

Crear archivo `.env` en la raíz:

```env
NODE_ENV=development
JWT_SECRET=detoke-super-secret-jwt-key-2026

# SQLite (Desarrollo)
DB_DIALECT=sqlite
DB_STORAGE=database.sqlite

# Demo data
SEED_DB=true
```

## Ejecución

```bash
# Desarrollo (backend + frontend)
npm run dev

# Solo backend
npm run server:dev

# Solo frontend
npm run client:dev

# Poblar base de datos
npm run seed
```

Servidores:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3002

## Estructura del Proyecto

```
detoke/
├── server.cjs              # Servidor Express principal
├── package.json
├── .env                    # Variables de entorno
├── models/                 # Modelos Sequelize
│   ├── index.js           # Exporta modelos
│   ├── usuario.js         # Modelo de usuario/negocio
│   ├── producto.js         # Modelo de producto
│   └── categoria.js       # Modelo de categoría
├── routes/                 # Rutas API
│   ├── api.js             # Router principal
│   ├── auth.js             # Login/Registro
│   ├── usuarios.js         # Rutas de negocios
│   ├── productos.js         # Rutas de productos
│   └── categorias.js       # Rutas de categorías
├── middleware/
│   └── auth.js             # Middleware JWT
├── seed/                   # Datos de prueba
│   ├── users.json
│   ├── products.json
│   └── categorias.json
├── data/
│   ├── images/              # Imágenes de productos
│   └── uploads/             # Archivos subidos
├── client/                  # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── BusinessHeader.tsx
│   │   │   ├── BusinessMap.tsx
│   │   │   ├── ImageGallery.tsx
│   │   │   └── BusinessHours.tsx
│   │   ├── routes/
│   │   │   ├── Home.tsx
│   │   │   ├── Company.tsx       # Landing page de negocio
│   │   │   ├── Dashboard.tsx
│   │   │   └── Login.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de vendedor
- `POST /api/auth/register` - Registro de vendedor
- `GET /api/auth/me` - Obtener usuario actual

### Negocios (Usuarios)
- `GET /api/usuarios` - Listar negocios activos
- `GET /api/usuarios/slug/:slug` - Obtener negocio por slug
- `GET /api/usuarios/:id` - Obtener negocio por ID
- `GET /api/usuarios/:id/products` - Productos de un negocio
- `POST /api/usuarios/:id/upload-cover` - Subir portada (protegido)
- `POST /api/usuarios/:id/upload-gallery` - Subir a galería (protegido)

### Productos
- `GET /api/productos` - Listar productos (filtros: categoryId, userId, search)
- `GET /api/productos/:id` - Obtener producto
- `POST /api/productos` - Crear producto (protegido)
- `PUT /api/productos/:id` - Actualizar producto (protegido)
- `DELETE /api/productos/:id` - Eliminar producto (protegido)

### Categorías
- `GET /api/categorias` - Listar categorías

## URLs del Frontend

- **Inicio**: http://localhost:3002
- **Login**: http://localhost:3002/login
- **Dashboard**: http://localhost:3002/dashboard
- **Negocio (slug)**: http://localhost:3002/negocio/don-juan-pizzeria
- **Negocio (ID)**: http://localhost:3002/empresa/vendor-1

## Datos de Prueba

### Vendedores
| Usuario | Contraseña | Negocio | Slug |
|----------|-------------|---------|------|
| donjuan | donjuan123 | Don Juan Pizzería | don-juan-pizzeria |
| verduleria | verduras123 | Verdulería María | verduleria-maria |
| almacen | almacen123 | Almacén El Ahorro | almacen-el-ahorro |

### Categorías
🍕 Comidas | 🛒 Almacén | 🥤 Bebidas | 🍞 Panadería | 🥩 Carnicería | 🥬 Frutas y Verduras | 🧀 Lácteos | 📦 Otros |

## Funcionalidades Pendientes

- [ ] Edición de perfil desde Dashboard
- [ ] Subida real de imágenes (Multer integrado)
- [ ] Mapa de todos los negocios en inicio
- [ ] Búsqueda por ubicación (geolocalización)
- [ ] Página de directorio de negocios
- [ ] Sistema de pedidos (más allá de WhatsApp)
- [ ] Panel de administración
- [ ] Verificación de negocios

## Licencia

MIT
