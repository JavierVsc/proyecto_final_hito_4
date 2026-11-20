
# NEXBYTE

**Proyecto final — Hito 4: Integración y despliegue**

NEXBYTE es una tienda online de productos tecnológicos desarrollada con React, Node.js, Express y PostgreSQL.

La plataforma funciona con un único vendedor: NEXBYTE. Los clientes pueden registrarse, iniciar sesión, consultar productos, guardar favoritos, administrar su carrito, registrar pedidos y revisar su perfil. La administración del catálogo está reservada a usuarios con rol administrador.

## Aplicación desplegada

**Frontend:** https://nexbyte-hito-4.onrender.com

**Repositorio GitHub:** https://github.com/JavierVsc/proyecto_final_hito_4

**Backend:** https://proyecto-final-hito-3.onrender.com

**Estado de la API:** https://proyecto-final-hito-3.onrender.com/api/v1/health

**Conexión PostgreSQL:** https://proyecto-final-hito-3.onrender.com/api/v1/health/db

**Catálogo desde la API:** https://proyecto-final-hito-3.onrender.com/api/v1/products

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

## Cumplimiento de los requisitos del Hito 4

### 1. Despliegue de la aplicación cliente

El frontend está desplegado en Render como Static Site.

La aplicación utiliza React Router y una regla de reescritura para permitir el acceso directo a las diferentes páginas sin errores de navegación.

**URL:** https://nexbyte-hito-4.onrender.com

### 2. Despliegue del backend

La API REST desarrollada en el Hito 3 está publicada en Render mediante un Web Service.

Se reutiliza el backend existente para atender las solicitudes de la aplicación cliente del Hito 4.

La API incluye rutas para autenticación, usuarios, categorías, productos, favoritos, carrito y pedidos.

**URL:** https://proyecto-final-hito-3.onrender.com

### 3. Despliegue de la base de datos

La aplicación utiliza PostgreSQL alojado en Render.

El modelo relacional está compuesto por nueve tablas:

- users
- categories
- products
- product_images
- favorites
- carts
- cart_items
- orders
- order_items

Los registros se almacenan en la base de datos y pueden recuperarse posteriormente desde la aplicación cliente.

### 4. Integración entre aplicación cliente y backend

El frontend React se comunica con la API REST de Express mediante solicitudes HTTP.

Las funcionalidades integradas incluyen:

- Consulta del catálogo de productos.
- Registro e inicio de sesión.
- Autenticación mediante JWT.
- Consulta y actualización del perfil.
- Favoritos persistentes por usuario.
- Carrito de compras persistente.
- Registro y consulta del historial de pedidos.
- Validación y actualización de stock.
- Administración de productos con control de permisos.

Se comprobó que la información permanece disponible después de cerrar sesión y volver a ingresar.

## Estructura del proyecto

| Directorio | Contenido |
| --- | --- |
| `frontend/` | Aplicación React, páginas, componentes, estilos y servicios |
| `frontend/src/context/` | Gestión del estado global de NEXBYTE |
| `frontend/src/services/` | Comunicación con la API REST |
| `backend/src/` | Servidor Express, rutas y middlewares |
| `backend/db/` | Estructura de PostgreSQL |
| `backend/scripts/` | Inicialización y administración de datos |
| `backend/tests/` | Pruebas automatizadas del servidor |
| `frontend/tests/` | Pruebas automatizadas del frontend |

## Pruebas realizadas

### Frontend

- Compilación de producción con Vite completada.
- 4 pruebas automatizadas aprobadas.

### Backend

- 15 pruebas automatizadas aprobadas con Node.js y Supertest.

### Integración en producción

Se comprobaron desde el sitio público:

- Visualización del catálogo.
- Autenticación de usuarios.
- Persistencia de favoritos.
- Persistencia del carrito.
- Registro y recuperación de pedidos.
- Consulta y edición del perfil.
- Creación de productos por administración.

Las pruebas confirmaron el funcionamiento de la comunicación entre el frontend, el backend y PostgreSQL.

## Configuración

El frontend utiliza la variable `VITE_API_URL` para establecer la dirección del backend.

El backend utiliza variables de entorno para configurar PostgreSQL, la autenticación JWT y los orígenes autorizados mediante CORS.

Los archivos que contienen credenciales privadas están excluidos del repositorio mediante `.gitignore`.

## Alcance

NEXBYTE es un proyecto académico de comercio electrónico.

El sistema permite registrar pedidos, pero no procesa pagos ni realiza cobros reales.

Los clientes no pueden publicar productos. La administración del catálogo corresponde exclusivamente a NEXBYTE.

El proyecto conserva su identidad visual oficial, incluyendo el logotipo, los colores y el diseño.
