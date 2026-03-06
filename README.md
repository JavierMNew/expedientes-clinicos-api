# API de Expedientes Clínicos — Seguridad en el Desarrollo de Aplicaciones

API para gestión de expedientes clínicos y consultas médicas, con autenticación JWT y control de roles. Almacena datos en SQLite. Diseñada para manejar datos de salud extremadamente sensibles.

## Tecnologías principales

- Node.js
- Express
- SQLite (archivo local)
- bcrypt (para hashing de contraseñas)
- jsonwebtoken / JWT (autenticación basada en tokens)
- validator (sanitización y validación de datos)
- dotenv (variables de entorno)

## Dependencias

Instalación:

```bash
npm install
```

## Estructura del proyecto

```
src/
  server.js                    # Punto de entrada: configura Express y monta las rutas
  config/
    database.js                # Conexión centralizada a SQLite
  constants/
    config.js                  # Variables de entorno (JWT_SECRET, PORT, etc.)
  middleware/
    auth.js                    # Middlewares: verificarToken, verificarRol
  utils/
    generateToken.js           # Generación y verificación de tokens JWT
  routes/
    auth.routes.js             # Rutas de autenticación y usuarios
    expediente.routes.js       # Rutas de expedientes clínicos
    consulta.routes.js         # Rutas de consultas médicas
db/
  init.sql                     # Script SQL para inicializar las tablas
  usuarios.db                  # Base de datos SQLite (generada)
```


## Inicializar la base de datos

```bash
sqlite3 db/usuarios.db < db/init.sql
```

Esquema de la base de datos:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  role TEXT DEFAULT 'doctor' CHECK(role IN ('doctor', 'admin', 'enfermero'))
);

CREATE TABLE IF NOT EXISTS expedientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_paciente TEXT NOT NULL,
  fecha_nacimiento TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK(sexo IN ('M', 'F')),
  tipo_sangre TEXT NOT NULL CHECK(tipo_sangre IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  alergias TEXT DEFAULT 'Ninguna',
  antecedentes TEXT DEFAULT 'Ninguno',
  creado_por INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS consultas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expediente_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  diagnostico TEXT NOT NULL,
  tratamiento TEXT NOT NULL,
  notas TEXT DEFAULT '',
  fecha_consulta DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id),
  FOREIGN KEY (doctor_id) REFERENCES usuarios(id)
);
```

## Ejecutar la API

```bash
node src/server.js
```

O en modo desarrollo:

```bash
npm run dev
```

El servidor escucha por defecto en `http://localhost:3000`.

---

## Endpoints

### Autenticación y usuarios (`/api/usuarios`)

#### `POST /api/usuarios/registro`

Registra un nuevo usuario del sistema.

- Payload:

```json
{
  "email": "doctor@hospital.com",
  "password": "SecurePass123",
  "nombre_completo": "Dr. Juan Pérez"
}
```

- Validaciones:
  - Email: Formato válido (validator.isEmail)
  - Contraseña: Mínimo 8 caracteres
  - Nombre completo: 2-150 caracteres, sanitizado con `validator.escape`
- Contraseña se almacena como hash bcrypt (saltRounds = 10)
- Respuestas:
  - `201` — Usuario registrado exitosamente
  - `400` — Datos inválidos
  - `409` — El usuario ya existe

---

#### `POST /api/usuarios/login`

Inicia sesión y retorna un token JWT.

- Payload:

```json
{
  "email": "doctor@hospital.com",
  "password": "SecurePass123"
}
```

- El JWT contiene SOLO: `id`, `email`, `role` (sin contraseñas ni datos sensibles)
- Respuestas:
  - `200` — Login exitoso. Retorna `token` y datos del usuario
  - `400` — Credenciales inválidas
  - `404` — Usuario no encontrado
  - `401` — Contraseña incorrecta

---

#### `POST /api/usuarios/cambiar-password`

Cambia la contraseña del usuario autenticado. **Requiere JWT.**

- Headers: `Authorization: Bearer <token>`
- Payload:

```json
{
  "email": "doctor@hospital.com",
  "nuevaPassword": "NuevaPass456"
}
```

---

#### `PUT /api/usuarios/cambiar-rol`

Cambia el rol de un usuario. **Requiere JWT + rol admin.**

- Roles válidos: `doctor`, `admin`, `enfermero`

---

### Expedientes Clínicos (`/api/expedientes`)

#### `POST /api/expedientes/crear`

Crea un nuevo expediente clínico. **Requiere JWT + rol doctor o admin.**

- Headers: `Authorization: Bearer <token>`
- Payload:

```json
{
  "nombre_paciente": "María García López",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "F",
  "tipo_sangre": "O+",
  "alergias": "Penicilina",
  "antecedentes": "Diabetes tipo 2"
}
```

- Validaciones:
  - nombre_paciente: 2-150 caracteres, sanitizado con `validator.escape`
  - fecha_nacimiento: Formato YYYY-MM-DD
  - sexo: M o F
  - tipo_sangre: A+, A-, B+, B-, AB+, AB-, O+, O-
  - alergias/antecedentes: Opcionales, sanitizados
  - **Anti-SQLi**: Consultas parametrizadas (?)
- Respuestas:
  - `201` — Expediente creado exitosamente
  - `400` — Datos inválidos
  - `401/403` — No autenticado / Sin permisos

---

#### `GET /api/expedientes/buscar/:id`

Busca un expediente por ID. **Requiere JWT.**

- Respuestas:
  - `200` — Expediente encontrado
  - `400` — ID inválido
  - `404` — Expediente no encontrado

---

### Consultas Médicas (`/api/consultas`)

#### `POST /api/consultas/crear`

Registra una nueva consulta médica. **Requiere JWT + rol doctor o admin.**

- Headers: `Authorization: Bearer <token>`
- Payload:

```json
{
  "expediente_id": 1,
  "motivo": "Dolor de cabeza persistente",
  "diagnostico": "Migraña tensional",
  "tratamiento": "Ibuprofeno 400mg cada 8 horas por 5 días",
  "notas": "Paciente refiere estrés laboral"
}
```

- Validaciones:
  - expediente_id: Entero positivo, verificado contra BD
  - motivo: 3-500 caracteres, sanitizado
  - diagnostico: 3-1000 caracteres, sanitizado
  - tratamiento: 3-1000 caracteres, sanitizado
  - notas: Opcional, sanitizado
  - **Anti-SQLi**: Consultas parametrizadas (?)
- Respuestas:
  - `201` — Consulta registrada exitosamente
  - `400` — Datos inválidos
  - `404` — Expediente no encontrado
  - `401/403` — No autenticado / Sin permisos

---

#### `GET /api/consultas/buscar/:expediente_id`

Lista todas las consultas de un expediente. **Requiere JWT.**

- Respuestas:
  - `200` — Lista de consultas
  - `400` — ID inválido
  - `404` — Expediente no encontrado

---

## Controles de Seguridad Implementados

| Control | Implementación |
|---------|----------------|
| **Hashing de contraseñas** | bcrypt con saltRounds = 10 |
| **Autenticación** | JWT firmado con clave secreta (HS256) |
| **Payload JWT seguro** | Solo contiene id, email, role (sin contraseñas) |
| **Anti-SQL Injection** | Consultas parametrizadas con placeholders `?` |
| **Anti-XSS** | `validator.escape()` en todos los inputs de texto |
| **Validación de inputs** | Tipos, rangos, formatos validados estrictamente |
| **Control de acceso por roles** | Middleware `verificarRol` para doctor, admin, enfermero |
| **Variables de entorno** | Claves sensibles en `.env` (no hardcoded) |
