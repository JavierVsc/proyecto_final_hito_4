
# NEXBYTE

**Proyecto final — Hito 4: Integración y despliegue**

NEXBYTE es una tienda online de productos tecnológicos, desarrollada con React, Node.js, Express y PostgreSQL.

La plataforma tiene un único vendedor: NEXBYTE. Los clientes pueden registrarse, iniciar sesión, consultar productos, guardar favoritos, administrar su carrito, registrar pedidos y revisar su perfil. La gestión del catálogo está reservada al administrador.

## Arquitectura

| Componente | Tecnología |
| --- | --- |
| Frontend | React, Vite y React Router |
| Estado global | React Context API |
| Backend | Node.js y Express |
| Base de datos | PostgreSQL |
| Acceso a datos | pg |
| Autenticación | JWT y bcrypt |
| Despliegue | Render |

## Aplicación desplegada

**Frontend del Hito 4:** enlace pendiente de publicación.

**Backend:** https://proyecto-final-hito-3.onrender.com

**Estado de la API:** https://proyecto-final-hito-3.onrender.com/api/v1/health

**Conexión PostgreSQL:** https://proyecto-final-hito-3.onrender.com/api/v1/health/db

**Catálogo desde la API:** https://proyecto-final-hito-3.onrender.com/api/v1/products

El Hito 4 reutiliza el backend y la base de datos desplegados durante el Hito 3, integrándolos con una nueva versión de la aplicación cliente.

## Cumplimiento del Hito 4

### 1. Despliegue de la aplicación cliente

El frontend está desarrollado con React y Vite, y preparado para su publicación como sitio estático en Render.

Se utiliza React Router para la navegación y una regla de reescritura para permitir el acceso directo a las rutas de la aplicación.

### 2. Despliegue del backend

La API REST de NEXBYTE está desplegada como Web Service en Render.

El backend proporciona rutas para autenticación, usuarios, categorías, productos, favoritos, carrito y pedidos.

### 3. Despliegue de la base de datos

La aplicación utiliza PostgreSQL alojado en Render.

El modelo incluye nueve tablas:

- users
- categories
- products
- product_images
- favorites
- carts
- cart_items
- orders
- order_items

### 4. Integración entre frontend y backend

La aplicación cliente consume la API REST mediante solicitudes HTTP.

Las funcionalidades integradas incluyen:

- Consulta del catálogo de productos.
- Registro e inicio de sesión de usuarios.
- Autenticación mediante JWT.
- Consulta y edición del perfil.
- Favoritos persistentes.
- Carrito de compras persistente.
- Registro y consulta de pedidos.
- Validación de stock al confirmar pedidos.
- Creación de productos con permisos de administrador.

La persistencia de los datos se realiza en PostgreSQL y permite recuperar la información después de cerrar sesión y volver a ingresar.

## Estructura del proyecto

- `frontend/`: aplicación React, componentes, páginas, servicios y estilos.
- `backend/src/`: API Express, rutas, middlewares y conexión a PostgreSQL.
- `backend/db/`: estructura de la base de datos.
- `backend/scripts/`: scripts de inicialización y administración.
- `backend/tests/`: pruebas automatizadas del backend.
- `frontend/tests/`: pruebas automatizadas del frontend.

## Pruebas

Frontend:

- 4 pruebas automatizadas aprobadas.
- Compilación de producción realizada con Vite.

Backend:

- 15 pruebas automatizadas aprobadas con Node.js y Supertest.

También se verificaron manualmente las funcionalidades integradas y su persistencia desde la aplicación cliente.

## Configuración

El frontend utiliza la variable de entorno `VITE_API_URL` para definir la dirección del backend.

El backend utiliza variables de entorno para la conexión a PostgreSQL, el secreto JWT y los orígenes autorizados mediante CORS.

Los archivos con credenciales privadas no se incluyen en el repositorio.

## Alcance

NEXBYTE es un proyecto académico de comercio electrónico. El registro de pedidos no implica un cobro real y no existe integración con pasarelas de pago.

Los clientes no pueden publicar productos. La administración del catálogo corresponde exclusivamente a NEXBYTE.

Se conserva la identidad visual oficial del proyecto, incluyendo su logotipo, colores y diseño.
