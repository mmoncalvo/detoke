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
| `npm run db:demo` | Recarga solo los datos de ejemplo (cuentas `@detoke.test`, sus negocios, productos y pedidos); las cuentas reales, sus negocios y pedidos quedan intactos |
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
- **`DATABASE_URL=postgres://…`**: Postgres, obligatorio en producción. Ahí `sync` también ajusta columnas (`alter`). Con una URL externa que pide TLS, `DATABASE_SSL=true`.

El proyecto está en modo pruebas: no hay migraciones. Si cambia un modelo, se regenera todo con `npm run db:seed`.

## Ubicación del negocio

En el registro y en Mi negocio, la ciudad y la dirección se autocompletan, y al tocar el mapa o arrastrar el marcador se completan dirección, barrio, ciudad, provincia y código postal (con "Deshacer"). El servidor consulta a [Georef](https://datosgobar.github.io/georef-ar-api/) y a [Photon](https://photon.komoot.io) con caché de 24 horas, un pedido por segundo como máximo a cada uno y un User-Agent con `CONTACT_EMAIL`. Si no responden, los campos se pueden completar a mano.

## Pedidos en tiempo real

Al enviar el pedido desde el checkout se crea en el servidor y el mensaje de WhatsApp lleva un link único (`/pedido/{código}`). El cliente sigue ahí el estado en vivo; el dueño lo ve aparecer al instante en **Pedidos** (con aviso, sonido opcional y contador) y lo avanza con pocos pasos: Nuevo (el cliente lo ve como Recibido) → Confirmado → Finalizado, o directo de Nuevo a Finalizado si lo retiran en el momento. También puede cancelarlo, con un motivo opcional.

Cuando un pedido sale, solo los productos de ese negocio se quitan del carrito (los de otros negocios quedan) y su tarjeta del checkout pasa a "Pedido realizado ✓" con **Ver estado**. El navegador guarda los últimos 20 pedidos (`detoke.recentOrders`, sin necesidad de cuenta): aparecen como **Pedidos en curso** en el carrito y el checkout, y en **Mis pedidos** (`/mis-pedidos`, con el ícono del header que cuenta los activos). Cada uno muestra el estado en vivo, permite **Reenviar por WhatsApp** mientras está Recibido (el mismo link, sin crear otro pedido) y **Repetir pedido**, que vuelve a cargar los productos disponibles con los precios de hoy. Los finalizados o cancelados se borran a los dos días, y los que ya no existen, al consultarlos.

Cada intento de envío lleva un `clientRequestId`: si el pedido se reintenta o se toca dos veces el botón, el servidor devuelve el mismo pedido en lugar de crear otro.

El tiempo real usa Socket.IO en el mismo servidor y puerto. El cliente se autentica en el handshake con el mismo JWT de la API; la room `business:{id}` es solo para el dueño (o un admin) y `order:{código}` es de solo lectura para quien tenga el link. Los cambios se hacen por la API REST, que valida permisos y transiciones, y el servidor emite `order:created` y `order:updated` solo a esas rooms.

## Contacto

El formulario de `/contact` guarda cada mensaje en `contact_messages`. Con `SMTP_HOST` en el `.env` también manda un aviso a `CONTACT_EMAIL` y un acuse a quien escribió; sin SMTP solo guarda y lo registra con `[contact]`. Los canales públicos salen de `CONTACT_EMAIL`, `CONTACT_WHATSAPP` y `CONTACT_HOURS`. Todavía no hay pantalla para leer los mensajes: se consultan por la API con la cuenta admin.

## Ingreso con Google

Sin credenciales el botón "Continuar con Google" no aparece y todo funciona igual. Para activarlo:

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) creá un proyecto y configurá la pantalla de consentimiento (tipo Externo, con el nombre Detoke).
2. Credenciales → Crear credenciales → ID de cliente de OAuth → tipo **Aplicación web**.
3. Orígenes de JavaScript autorizados: `http://localhost:3000` y `https://detoke.onrender.com`.
4. URI de redireccionamiento autorizados: `http://localhost:3000/api/auth/google/callback` y `https://detoke.onrender.com/api/auth/google/callback`.
5. Copiá el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (en el `.env` y en Render) y reiniciá el servidor.

Cómo funciona: el servidor manda a Google, recibe el código en `/api/auth/google/callback`, verifica la identidad y devuelve a la web un código de un solo uso que `/auth/callback` canjea por la sesión. Si el email ya tenía cuenta se vinculan; si no, se crea una cuenta de vendedor y el registro sigue en "Tu negocio". Las cuentas admin no pueden entrar con Google.

## Deploy en Render

`render.yaml` define el servicio web y una base Postgres (Blueprint): en Render, New → Blueprint → elegir este repo.

- **Build:** `npm ci --include=dev && npm run build` (tsx y vite son dependencias de desarrollo).
- **Start:** `npm start`. Health check: `/api/health`.
- **Variables:** `NODE_ENV=production`, `APP_URL=https://detoke.onrender.com`, `JWT_SECRET` (Render la genera), `DATABASE_URL` (sale de la base `detoke-db`), `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, `CORS_ORIGINS=https://detoke.onrender.com`, `CONTACT_EMAIL`, `CONTACT_WHATSAPP` y `CONTACT_HOURS`, y opcionalmente `SMTP_*`.
- **Datos de ejemplo:** la primera vez, desde la Shell del servicio, `npm run db:seed` (borra la base). Las fotos del seed salen del repo (`data/images`).
- **Archivos subidos:** el disco de Render es efímero, así que `data/uploads` se pierde en cada deploy. Para conservarlos hace falta un Persistent Disk (plan pago) montado, por ejemplo, en `/var/data`, con `UPLOADS_DIR=/var/data/uploads`; más adelante, un almacenamiento externo.
- En producción sin `DATABASE_URL` el servidor no arranca y lo explica en el log.
- Si falta `APP_URL`, se usa `RENDER_EXTERNAL_URL`, que Render define solo. Si Google responde `redirect_uri_mismatch`, la URI de redireccionamiento cargada en Google Cloud Console no coincide exactamente con `APP_URL` + `/api/auth/google/callback`.

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
| `GET /api/geo/cities?q=` | Ciudades: OpenStreetMap (Uruguay, primero) y Georef (Argentina, con ", Argentina"), "Ciudad, Departamento" |
| `GET /api/geo/addresses?q=&lat=&lng=` | Direcciones cerca de un punto (Photon, OpenStreetMap) |
| `GET /api/geo/reverse?lat=&lng=` | La dirección de un punto del mapa |
| `POST /api/auth/register/customer` | Crea una cuenta de cliente (sin negocio) |
| `GET /api/orders/customer` 🔒 · `POST /api/orders/claim` 🔒 | Historial de compras de la cuenta · asocia los pedidos guardados en el navegador |
| `GET /api/auth/me/cart` · `PUT` 🔒 | Carrito guardado en la cuenta |
| `POST /api/orders` | Crea un pedido (recalcula precios y reglas del negocio) y devuelve su link `/pedido/{código}`; con el mismo `clientRequestId` devuelve el pedido ya creado |
| `PATCH /api/auth/me` 🔒 | Edita nombre, email y teléfono (el email no, si un admin navega en nombre del usuario) |
| `POST /api/auth/me/password` 🔒 | Cambia la contraseña pidiendo la actual, o la crea si la cuenta es solo de Google; bloqueado en impersonación |
| `POST /api/auth/me/avatar` · `DELETE` 🔒 | Sube (recorte cuadrado 256 px) o quita la foto de perfil |
| `GET /api/og/business/:slug.jpg` | Imagen 1200×630 para la vista previa de links (pedidos y negocios) en WhatsApp |
| `GET /api/orders/public/:code` | El pedido por su código; el dueño o un admin reciben `canManage` |
| `GET /api/orders/mine` 🔒 | Pedidos de mi negocio (`?status=`, `?since=`) |
| `PATCH /api/orders/:code/status` 🔒 | Cambia el estado (dueño o admin): `pending` → `confirmed` → `completed`, o `cancelled` (ver `shared/orders.ts`) |
| `GET /data/...` | Imágenes y archivos subidos |

🔒 Pide `Authorization: Bearer <token>`.

## Interfaz

Los componentes de shadcn/ui (estilo new-york) están en `src/components/ui/`; la marca (verde botella, mostaza, papel cálido) son tokens en `src/index.css`. Las tipografías son Quicksand (títulos, la misma del logo) y Figtree (texto), instaladas con fontsource.

## Administración

La cuenta admin entra a `/dashboard` y ve el listado de cuentas. Desde ahí puede navegar el sistema en nombre de un vendedor: la web muestra un aviso fijo y "Volver a mi cuenta". El token de esa sesión dura 2 horas, no sirve para las rutas de admin y cada escritura queda registrada en `impersonation_logs` y `audit_logs`.

## Sesión

Se usa un token JWT (7 días) guardado en el navegador. `JWT_SECRET` es obligatorio en producción.
