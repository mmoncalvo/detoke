# Detoke

Directorio de comercios de barrio con catálogo online. Cada negocio tiene su página con productos, horarios, mapa, medios de pago y entrega; quien compra arma el pedido y lo manda por WhatsApp. Cada vendedor administra todo desde su panel.

**Regla del proyecto:** el código va en inglés (archivos, variables, tipos, columnas, rutas de la API, claves de JSON y comentarios) y todo lo que ve el usuario va en español (pantallas, toasts, errores de la API y el mensaje de WhatsApp).

## Estructura

Una sola app con un `package.json`. Express sirve la API en `/api`, las imágenes en `/data` y la web en el mismo puerto (3000).

```
server.ts            Entrada: Express + Vite (desarrollo) o dist/ (producción)
server/
  config.ts          Lee el .env; avisa con [config] si usa un valor por defecto
  db.ts              Sequelize (SQLite o Postgres) + sync
  app.ts             Arma la app de Express (también la usan las pruebas)
  models/            User, Business, BusinessCategory, Product, ProductCategory, ContactMessage
  routes/            auth, businesses, products, categories, search, contact
  middleware/        requireAuth (token Bearer), rateLimit, errorHandler
  services/          upload (multer + sharp), mail, seed, slug, response
  data/seed/         JSON de los datos de ejemplo
shared/              Lo que usan el servidor y la web
  business.ts        Horarios y "abierto ahora", medios de pago, entrega, slugs
  schemas.ts         Validación con zod (API y formularios)
  profile.ts         Checklist del perfil del negocio
  types.ts           Tipos de la API
src/                 Web React + shadcn/ui + Tailwind v4
  api.ts             Cliente fetch: desempaqueta { success, data }
  context/           AuthContext, CartContext, ThemeContext (claro y oscuro)
  layouts/           PublicLayout, DashboardLayout
  components/        ui/ (shadcn), common/, layout/, business/, product/, dashboard/
  pages/             Home, Explore, BusinessPage, Checkout, Contact, Login, Register
  pages/dashboard/   Overview, Products, BusinessProfile, Hours, Gallery, DeliveryPayments
public/seed/logos/   Logos SVG de los negocios de ejemplo
test/                Pruebas de la API (vitest + supertest) sobre una SQLite temporal
scripts/             seed.ts, check-seed-images.ts; legacy/ guarda los scripts viejos
data/                images/ (fotos del seed, en git) y uploads/ (subidas, fuera de git); se publican en /data
```

Las respuestas de la API son siempre `{ success: true, data }` o `{ success: false, error }`, con el error en español.

## Primera vez

```bash
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

Las fotos del seed están en `data/images/`; lo que suben los usuarios va a `data/uploads/`, que no está en git.

## Día a día

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta API + web en http://localhost:3000 |
| `npm test` | Pruebas de la API (SQLite temporal) |
| `npm run lint` | Chequeo de tipos (igual que `npm run typecheck`) |
| `npm run db:seed` | **Borra la base** y carga los datos de ejemplo |
| `npm run db:check-images` | Verifica que existan todas las imágenes del seed |
| `npm run build` | Compila la web en `dist/` |
| `npm start` | Producción: sirve la API, `/data` y `dist/` |

## Cuentas de ejemplo

Todas con contraseña `detoke1234`. El seed las lista completas en la consola.

- `admin@detoke.test`: administración, sin panel de vendedor.
- Un vendedor por rubro, y `2` o `3` para los siguientes negocios del mismo rubro: `pizzeria@detoke.test` (Lo de Tito), `rotiseria@`, `restaurante@`, `panaderia@`, `almacen@`, `supermercado@`, `kiosco@`, `carniceria@`, `verduleria@`, `fiambreria@`, `dietetica@`, `bebidas@`.

Todos los negocios de ejemplo usan el mismo WhatsApp de prueba.

## Base de datos

El dialecto sale de `DATABASE_URL`:

- **Sin `DATABASE_URL`**: SQLite en `./database.sqlite` (otra ruta con `DATABASE_PATH`). `sync` crea las tablas que faltan pero no modifica las existentes.
- **`DATABASE_URL=postgres://…`**: Postgres. Ahí `sync` también ajusta columnas (`alter`).

El proyecto está en modo pruebas: no hay migraciones. Si cambia un modelo, se regenera todo con `npm run db:seed`.

## Contacto

El formulario de `/contact` guarda cada mensaje en `contact_messages`. Con `SMTP_HOST` en el `.env` también manda un aviso a `CONTACT_EMAIL` y un acuse a quien escribió; sin SMTP solo guarda y lo registra con `[contact]`. Los canales públicos salen de `CONTACT_EMAIL`, `CONTACT_WHATSAPP` y `CONTACT_HOURS`. Todavía no hay pantalla para leer los mensajes: se consultan por la API con la cuenta admin.

## Imágenes

Se aceptan JPG, PNG y WEBP de hasta 8 MB. `sharp` las recorta (logo cuadrado, portada 16:9, productos 1:1) y las guarda en WEBP en `data/uploads/`.

## API

| Ruta | Qué hace |
| --- | --- |
| `GET /api/health` | Estado del servidor |
| `POST /api/auth/register` | Crea cuenta y negocio juntos; devuelve `{ token, user, business }` |
| `POST /api/auth/login` | Por email; devuelve `{ token, user, business }` |
| `GET /api/auth/me` 🔒 | Usuario y negocio de la sesión |
| `GET /api/businesses` | Negocios activos (`?category=`, `?search=`, `?open=true`, `?delivery=true`) |
| `GET /api/businesses/:slug` | Negocio con sus productos disponibles |
| `GET`, `PUT /api/businesses/me` 🔒 | Ver o editar mi negocio (cualquier subconjunto de campos) |
| `POST /api/businesses/me/logo`, `/cover` 🔒 | Sube la imagen (campo `image`) |
| `POST`, `DELETE /api/businesses/me/gallery` 🔒 | Agrega (campo `images`) o quita fotos |
| `GET /api/products` | Productos disponibles (`?businessId=`, `?category=`, `?search=`, `?featured=true`) |
| `GET /api/products/:id` | Un producto |
| `GET /api/products/mine` 🔒 | Todos mis productos |
| `POST /api/products/images` 🔒 | Sube una imagen y devuelve su ruta |
| `POST /api/products`, `PUT`, `DELETE /api/products/:id` 🔒 | Alta, edición y baja (solo el dueño) |
| `GET /api/business-categories`, `/api/product-categories` | Rubros y categorías |
| `GET /api/search?q=` | Buscador global, sin distinguir acentos |
| `GET /api/contact/info` | Canales de contacto públicos |
| `POST /api/contact` | Guarda el mensaje del formulario (hasta 5 por hora e IP) y, con SMTP, avisa por email |
| `GET /api/contact`, `PATCH /api/contact/:id` 🔒 | Solo admin: listado paginado (`?page=`, `?status=`) y cambio de estado |
| `GET /api/admin/users` 🔒 | Solo admin: cuentas con su negocio (`?search=`, `?category=`, `?status=active\|inactive\|incomplete`, paginado) |
| `POST /api/admin/impersonate/:userId` 🔒 | Solo admin: sesión de 2 horas en nombre de un vendedor |
| `POST /api/admin/impersonate/stop` 🔒 | Termina la sesión en nombre de otro |
| `GET /data/...` | Imágenes y archivos subidos |

🔒 Pide `Authorization: Bearer <token>`.

## Interfaz

Los componentes de shadcn/ui (estilo new-york) están en `src/components/ui/`; la marca (verde botella, mostaza, papel cálido) son tokens en `src/index.css`. Las tipografías son Bricolage Grotesque y Figtree, instaladas con fontsource.

## Administración

La cuenta admin entra a `/dashboard` y ve el listado de cuentas. Desde ahí puede navegar el sistema en nombre de un vendedor: la web muestra un aviso fijo y "Volver a mi cuenta". El token de esa sesión dura 2 horas, no sirve para las rutas de admin y cada escritura queda registrada en `impersonation_logs` y `audit_logs`.

## Sesión

Se usa un token JWT (7 días) guardado en el navegador. `JWT_SECRET` es obligatorio en producción.
