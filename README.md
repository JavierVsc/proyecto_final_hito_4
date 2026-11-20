# NEXBYTE

**Proyecto final · Hito 3 — Desarrollo Backend**

NEXBYTE es una tienda online de productos tecnológicos con un único vendedor: NEXBYTE. La aplicación conserva el frontend desarrollado en el Hito 2 y añade una API REST conectada a PostgreSQL, con autenticación, autorización y operaciones sobre productos, perfiles, favoritos, carrito y pedidos.

**Frontend público:** https://nexbyte-hito-2.onrender.com

**Backend público:** https://proyecto-final-hito-3.onrender.com

**API REST:** https://proyecto-final-hito-3.onrender.com/api/v1

**Consultas**
- Estado de la API: https://proyecto-final-hito-3.onrender.com/api/v1/health
- Estado de PostgreSQL: https://proyecto-final-hito-3.onrender.com/api/v1/health/db
- Categorías: https://proyecto-final-hito-3.onrender.com/api/v1/categories
- Productos: https://proyecto-final-hito-3.onrender.com/api/v1/products

## Arquitectura

| Directorio | Componentes |
| --- | --- |
| `frontend/` | React, Vite, React Router, Context API y CSS oficial de NEXBYTE |
| `backend/src/app.js` | Servidor Express, CORS y rutas de la API |
| `backend/src/routes/` | Controladores de autenticación, usuarios, catálogo, favoritos, carrito y pedidos |
| `backend/src/middlewares/` | Validación, JWT, control de roles y manejo de errores |
| `backend/src/db/` | Conexión a PostgreSQL mediante `pg` |
| `backend/db/schema.sql` | Modelo relacional de nueve tablas definido en el Hito 1 |
| `backend/scripts/` | Inicialización de la base, catálogo inicial y alta administrativa |
| `backend/tests/` | Pruebas HTTP automatizadas con Supertest |
| `backend/thunder-client/` | Colección y entorno de pruebas manuales de API |

## Cumplimiento de los requisitos — Hito 3

**1. Nuevo proyecto npm y dependencias (1 punto)**  
El backend es un proyecto Node.js independiente con dependencias declaradas en `backend/package.json`: Express, `pg`, `jsonwebtoken`, `cors`, `bcryptjs`, `dotenv`, `express-validator`, Supertest y Nodemon.

**2. Comunicación PostgreSQL mediante pg (3 puntos)**  
La conexión se implementa con `pg.Pool` en `backend/src/db/pool.js`. La API realiza consultas parametrizadas y operaciones transaccionales sobre las nueve tablas, devolviendo resultados JSON al cliente.

**3. Autenticación y autorización JWT (2 puntos)**  
El registro utiliza bcrypt para almacenar hashes de contraseñas. El inicio de sesión verifica credenciales y entrega un JWT; las rutas privadas comprueban el token y el rol del usuario.

**4. CORS (1 punto)**  
Express utiliza el middleware `cors` con una lista configurable de orígenes autorizados. Incluye el frontend local y el frontend publicado de NEXBYTE.

**5. Middlewares de seguridad (2 puntos)**  
`verifyToken`, `requireRole`, `validate` y `errorHandler` protegen las rutas y validan datos, credenciales, cabeceras y permisos administrativos.

**6. Pruebas de rutas API REST (1 punto)**  
`backend/tests/api.test.js` contiene 15 pruebas con Supertest para múltiples rutas, verificando respuestas HTTP 200, 201, 400, 401, 403 y 404. Se incluyen ejemplos manuales para Thunder Client.

## Contrato API REST

Prefijo: `/api/v1` · Respuestas JSON · Precios expresados en pesos chilenos enteros.

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/health`, `/health/db` | Público |
| POST | `/auth/register`, `/auth/login` | Público |
| GET / PATCH | `/users/me` | Autenticado |
| GET | `/categories` | Público |
| GET | `/products`, `/products/:id` | Público |
| POST | `/products` | Administrador |
| PATCH / DELETE | `/products/:id` | Administrador |
| GET / POST | `/favorites` | Autenticado |
| DELETE | `/favorites/:productId` | Autenticado |
| GET | `/cart` | Autenticado |
| POST | `/cart/items` | Autenticado |
| PATCH / DELETE | `/cart/items/:productId` | Autenticado |
| GET / POST | `/orders` | Autenticado |
| GET | `/orders/:id` | Propietario o administrador |

## Configuración técnica

**Variables de entorno:** `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `PORT`. La plantilla se encuentra en `backend/.env.example`.

**Scripts npm:** `dev`, `start`, `test`, `db:setup`, `db:seed` y `admin:create`.

**Base relacional:** `users`, `categories`, `products`, `product_images`, `favorites`, `carts`, `cart_items`, `orders` y `order_items`.

## Alcance

La API no gestiona pagos en línea ni registro de vendedores externos. Los pedidos calculan su total en el servidor, validan existencias y conservan el historial de precios de venta. El frontend continúa con su configuración de demostración mientras se desarrolla la integración de los siguientes hitos.

La identidad visual, los colores y el archivo `frontend/public/logo_horizontal.png` son los oficiales de NEXBYTE.
