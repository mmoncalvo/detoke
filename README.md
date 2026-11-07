# Detoke

Directorio de comercios de barrio con catálogo online. Cada negocio tiene su página con productos, horarios, mapa y galería; quien compra arma el carrito y hace el pedido por WhatsApp. Cada vendedor administra su perfil y sus productos desde el panel.

## Estructura

Una sola app con un `package.json`. Express sirve la API en `/api`, las imágenes en `/data` y la web en el mismo puerto (3000).

```
server.ts            Entrada: Express + Vite (desarrollo) o dist/ (producción)
server/
  config.ts          Lee el .env; avisa con [config] si usa un valor por defecto
  db.ts              Sequelize (SQLite o Postgres) + sync
  app.ts             Arma la app de Express (también la usan las pruebas)
  models/            User, Product, Category (sequelize-typescript)
  routes/            auth, users, products, categories, search
  middleware/        requireAuth (token Bearer), errorHandler
  services/          upload (multer), seed, response
  data/seed/         JSON de los datos de ejemplo
shared/              Tipos que usan el servidor y la web
src/                 Web React + Tailwind v4
  api.ts             Cliente fetch
  context/           AuthContext, CartContext, ThemeContext
  components/        Navbar, ProductCard, ProductModal, BusinessMap, ...
  pages/             Home, Explorar, Company, Checkout, Dashboard, Login
test/                Pruebas de la API (vitest + supertest) sobre una SQLite temporal
scripts/             seed.ts; legacy/ guarda los scripts viejos de descarga de imágenes
data/                images/ y uploads/ (se publican en /data; no están en git)
```

Las respuestas de la API son siempre `{ success: true, data }` o `{ success: false, error }`, con el error en español.

## Primera vez

```bash
cp .env.example .env
npm install
npm run dev
```

La carpeta `data/` no está en git: las imágenes se copian aparte.

## Día a día

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta API + web en http://localhost:3000 |
| `npm test` | Pruebas de la API (SQLite temporal) |
| `npm run lint` | Chequeo de tipos (igual que `npm run typecheck`) |
| `npm run db:seed` | **Borra la base** y carga los datos de ejemplo |
| `npm run build` | Compila la web en `dist/` |
| `npm start` | Producción: sirve la API, `/data` y `dist/` |

Usuarios de ejemplo, todos con contraseña `password123`: seis por rubro, con el prefijo del rubro y un número. Por ejemplo `piz1` (pizzería), `alm1` (almacén), `car1` (carnicería), `pan1` (panadería) y `ver1` (verdulería). Los otros prefijos son `die`, `fia`, `kio`, `rot` y `sup`.

## Base de datos

El dialecto sale de `DATABASE_URL`:

- **Sin `DATABASE_URL`**: SQLite en `./database.sqlite` (otra ruta con `DATABASE_PATH`). Si el archivo no existe se crea solo, vacío: `npm run db:seed` carga los datos de ejemplo. `sync` crea las tablas que faltan pero no modifica las existentes.
- **`DATABASE_URL=postgres://…`**: Postgres. Ahí `sync` también ajusta columnas (`alter`).

Las tablas (`Users`, `Products`, `Categories`) y sus columnas en camelCase son las de siempre, por eso los modelos no usan `underscored`.

## API

| Ruta | Qué hace |
| --- | --- |
| `GET /api/health` | Estado del servidor |
| `POST /api/auth/register`, `POST /api/auth/login` | Devuelven `{ token, user }` |
| `GET /api/auth/me` 🔒 | Usuario de la sesión |
| `GET /api/usuarios` | Negocios activos (`?search=`) |
| `GET /api/usuarios/slug/:slug`, `GET /api/usuarios/:id` | Negocio con sus productos |
| `GET /api/usuarios/:id/products` | Productos del negocio (`?categoryId=`) |
| `PUT /api/usuarios/:id` 🔒 | Edita el perfil (dueño o admin) |
| `POST /api/usuarios/:id/upload-cover` 🔒 | Portada (campo `cover`) |
| `POST /api/usuarios/:id/upload-gallery` 🔒 | Galería (campo `gallery`, hasta 10) |
| `GET /api/productos` | Productos disponibles (`?categoryId=`, `?userId=`, `?search=`) |
| `GET /api/productos/:id` | Un producto |
| `POST /api/productos` 🔒 | Crea un producto (JSON, o multipart con campo `image`) |
| `PUT /api/productos/:id`, `DELETE /api/productos/:id` 🔒 | Edita o borra (solo el dueño) |
| `POST /api/productos/:id/upload-image` 🔒 | Agrega una imagen (campo `image`) |
| `GET /api/categorias` | Categorías activas |
| `GET /api/search?q=` | Buscador global de negocios, productos y categorías |
| `GET /data/...` | Imágenes y archivos subidos |

🔒 Pide `Authorization: Bearer <token>`.

## Sesión

Se usa un token JWT (7 días) guardado en el navegador. `JWT_SECRET` es obligatorio en producción.
