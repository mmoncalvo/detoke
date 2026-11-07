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
  pages/             Home, Explore, Company, Checkout, Dashboard, Login
test/                Pruebas de la API (vitest + supertest) sobre una SQLite temporal
scripts/             seed.ts; migrations/ con los cambios de la base; legacy/ guarda los scripts viejos de descarga de imágenes
data/                images/ y uploads/ (se publican en /data; no están en git)
```

Las respuestas de la API son siempre `{ success: true, data }` o `{ success: false, error }`, con el error en español.

**Regla del proyecto:** el código va en inglés (archivos, variables, tipos, columnas, rutas de la API, claves de JSON y comentarios) y todo lo que ve el usuario va en español (pantallas, toasts, errores de la API y el mensaje de WhatsApp).

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

Las tablas son `Users`, `Products` y `Categories`, con columnas en camelCase, por eso los modelos no usan `underscored`.

Una base SQLite anterior, con columnas en español, se actualiza con este comando (se puede correr más de una vez; hacé una copia antes):

```bash
npx tsx scripts/migrations/001-english-columns.ts
```

## API

| Ruta | Qué hace |
| --- | --- |
| `GET /api/health` | Estado del servidor |
| `POST /api/auth/register`, `POST /api/auth/login` | Devuelven `{ token, user }` |
| `GET /api/auth/me` 🔒 | Usuario de la sesión |
| `GET /api/users` | Negocios activos (`?search=`) |
| `GET /api/users/slug/:slug`, `GET /api/users/:id` | Negocio con sus productos |
| `GET /api/users/:id/products` | Productos del negocio (`?categoryId=`) |
| `PUT /api/users/:id` 🔒 | Edita el perfil (dueño o admin) |
| `POST /api/users/:id/upload-cover` 🔒 | Portada (campo `cover`) |
| `POST /api/users/:id/upload-gallery` 🔒 | Galería (campo `gallery`, hasta 10) |
| `GET /api/products` | Productos disponibles (`?categoryId=`, `?userId=`, `?search=`) |
| `GET /api/products/:id` | Un producto |
| `POST /api/products` 🔒 | Crea un producto (JSON, o multipart con campo `image`) |
| `PUT /api/products/:id`, `DELETE /api/products/:id` 🔒 | Edita o borra (solo el dueño) |
| `POST /api/products/:id/upload-image` 🔒 | Agrega una imagen (campo `image`) |
| `GET /api/categories` | Categorías activas |
| `GET /api/search?q=` | Buscador global de negocios, productos y categorías |
| `GET /data/...` | Imágenes y archivos subidos |

🔒 Pide `Authorization: Bearer <token>`.

## Sesión

Se usa un token JWT (7 días) guardado en el navegador. `JWT_SECRET` es obligatorio en producción.
