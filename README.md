# API de aprendizaje sobre Seguridad en el Desarrollo de Aplicaciones

API para gestión de usuarios, productos y carrito de compras, con autenticación JWT y control de roles. Almacena datos en SQLite.

## Giro de la API

La API permite registrar usuarios, iniciar sesión (obteniendo un token JWT), gestionar contraseñas y roles, crear productos y agregar productos a un carrito de compras. Todas las contraseñas se hashean con `bcrypt` y se almacenan de forma segura en SQLite.

## Tecnologías principales

- Node.js
- Express
- SQLite (archivo local)
- bcrypt (para hashing de contraseñas)
- jsonwebtoken / JWT (autenticación basada en tokens)
- validator (sanitización y validación de datos)
- dotenv (variables de entorno)

## Dependencias (package.json)

- express
- sqlite3
- bcrypt
- jsonwebtoken
- validator
- dotenv

Instalación de dependencias:

```bash
npm install
```

## Estructura del proyecto

```
src/
  server.js                  # Punto de entrada: configura Express y monta las rutas
  config/
    database.js              # Conexión centralizada a SQLite
  constants/
    config.js                # Variables de entorno (JWT_SECRET, PORT, etc.)
  middleware/
    auth.js                  # Middlewares: verificarToken, verificarRol
  utils/
    generateToken.js         # Generación y verificación de tokens JWT
  routes/
    auth.routes.js           # Rutas de autenticación y usuarios
    product.routes.js        # Rutas de productos
    cart.routes.js           # Rutas del carrito de compras
db/
  init.sql                   # Script SQL para inicializar las tablas
  usuarios.db                # Base de datos SQLite (generada)
```

## Reglas y comportamiento relevante

- El archivo de base de datos utilizado es `db/usuarios.db` (SQLite, sin servidor).
- La conexión a la BD está centralizada en `src/config/database.js` y es reutilizada por todas las rutas.
- Se usan `db.get()` para consultas que devuelven una fila y `db.run()` para `INSERT`, `UPDATE`, `DELETE`.
- Las consultas están parametrizadas (placeholders `?`) para prevenir SQL injection.
- La validación de contraseña en el servidor exige una longitud estricta: debe cumplir 8 < password < 10 (es decir, longitud válida = 9 caracteres).
- `bcrypt` se usa con `saltRounds = 10` para generar el hash almacenado.
- La autenticación se realiza mediante tokens JWT enviados en el header `Authorization: Bearer <token>`.
- El sistema de roles soporta: `cliente` (por defecto), `admin`, `moderador`, `limpiapiso`.
- Las rutas están organizadas con Express Router en archivos separados para mantener `server.js` limpio.

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
PORT= (Puerto de preferencia)
JWT_SECRET= (Ingresar la llave secreta)
JWT_EXPIRES_IN= (Ingresar las horas necesarias)
JWT_ALGORITHM= (Usualmente HS256)
```

## Inicializar la base de datos

Hay un script SQL en `db/init.sql` que crea las tablas necesarias. Puedes inicializar la base de datos con:

```bash
sqlite3 db/usuarios.db < db/init.sql
```

Esquema de la base de datos:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'cliente'
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## Ejecutar la API

Iniciar el servidor:

```bash
node src/server.js
```

O en modo desarrollo con recarga automática:

```bash
npm run dev
```

El servidor escucha por defecto en `http://localhost:3000`.

---

## Endpoints

### Autenticación y usuarios (`auth.routes.js`)

#### `POST /registro`

Registra un nuevo usuario.

- Payload:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "123456789"
}
```

- Respuestas:
  - `201` — Usuario registrado exitosamente.
  - `400` — Credenciales inválidas (faltan datos o la contraseña no tiene 9 caracteres).
  - `409` — El usuario ya existe.

---

#### `POST /login`

Inicia sesión y retorna un token JWT.

- Payload:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "123456789"
}
```

- Respuestas:
  - `200` — Inicio de sesión exitoso. Retorna `token` y datos del usuario (`id`, `email`, `role`).
  - `400` — Credenciales inválidas (faltan datos).
  - `404` — Usuario no encontrado.
  - `401` — Contraseña incorrecta.

---

#### `POST /cambiar-password`

Cambia la contraseña del usuario autenticado. **Requiere token JWT.**

- Headers: `Authorization: Bearer <token>`
- Payload:

```json
{
  "email": "usuario@ejemplo.com",
  "nuevaPassword": "987654321"
}
```

- Respuestas:
  - `200` — Contraseña actualizada exitosamente.
  - `400` — Datos faltantes o contraseña no cumple la longitud requerida (9 caracteres).
  - `403` — Intento de cambiar la contraseña de otro usuario.
  - `404` — Usuario no encontrado.

---

#### `PUT /cambiar-rol`

Cambia el rol de un usuario. **Requiere token JWT y rol `admin`.**

- Headers: `Authorization: Bearer <token>`
- Payload:

```json
{
  "email": "usuario@ejemplo.com",
  "nuevoRol": "moderador"
}
```

- Roles válidos: `cliente`, `admin`, `moderador`, `limpiapiso`.
- Respuestas:
  - `200` — Rol actualizado exitosamente. Retorna rol anterior y nuevo.
  - `400` — Datos faltantes o rol no válido.
  - `403` — Permisos insuficientes (no eres admin).
  - `404` — Usuario no encontrado.

---

### Productos (`product.routes.js`)

#### `POST /product/crear`

Crea un nuevo producto.

- Payload:

```json
{
  "name": "Teclado mecánico",
  "price": 1299.99,
  "stock": 50
}
```

- Validaciones: nombre (string, 1-100 chars, sanitizado con `validator.escape`), precio (número > 0), stock (entero >= 0).
- Respuestas:
  - `201` — Producto creado correctamente.
  - `400` — Datos inválidos (nombre, precio o stock).

---

### Carrito (`cart.routes.js`)

#### `POST /cart/agregar`

Agrega un producto al carrito de un usuario.

- Payload:

```json
{
  "user_id": 1,
  "product_id": 2,
  "quantity": 3
}
```

- Validaciones: `user_id`, `product_id` y `quantity` deben ser enteros positivos. Verifica existencia del usuario y producto, y disponibilidad de stock.
- Respuestas:
  - `201` — Producto agregado al carrito.
  - `400` — Datos inválidos o stock insuficiente.
  - `404` — Usuario o producto no encontrado.

---

## Notas de seguridad y operación

- Las contraseñas nunca se almacenan en texto plano: solo se guarda el hash generado por `bcrypt`.
- Las consultas parametrizadas evitan inyección SQL.
- La autenticación se maneja con JWT. Los tokens incluyen `id`, `email` y `role` del usuario.
- El middleware `verificarToken` valida el token en rutas protegidas.
- El middleware `verificarRol` restringe el acceso según el rol del usuario autenticado.
- Los nombres de productos se sanitizan con `validator.escape()` para prevenir XSS.
- Las rutas están modularizadas con Express Router, manteniendo `server.js` limpio y enfocado en configuración.

