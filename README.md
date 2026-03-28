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

Ver la sección [Estructura del proyecto (actualizada)](#estructura-del-proyecto-actualizada) más abajo para la estructura completa incluyendo el sistema de logs.



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

## Sistema de Logs (Winston)

El proyecto implementa un sistema de logging robusto utilizando [Winston](https://github.com/winstonjs/winston), que cumple con las mejores prácticas de observabilidad y seguridad OWASP.

### Configuración del Motor

- **Motor**: Winston v3
- **Archivos de log**:
  - `logs/combined.log` — Contiene TODOS los registros (desde el nivel configurado)
  - `logs/error.log` — Contiene solo registros de nivel `error` y `fatal`
- **Formato de cada línea**:

```
[Fecha y Hora] | [Nivel de Severidad] | [Mensaje]
```

Ejemplo real:

```
[2026-03-28 09:30:15] | INFO | Servidor corriendo en http://localhost:3000
[2026-03-28 09:30:15] | INFO | Conectado a la base de datos SQLite
[2026-03-28 09:30:22] | DEBUG | Petición de login recibida - email: doctor@hospital.com, IP: ::1
[2026-03-28 09:30:22] | INFO | Inicio de sesión exitoso para usuario: doctor@hospital.com
[2026-03-28 09:30:22] | DEBUG | [POST] /api/usuarios/login - status: 200 - 85ms
[2026-03-28 09:31:05] | WARN | Intento de login con contraseña incorrecta para usuario: doctor@hospital.com
[2026-03-28 09:31:05] | WARN | [POST] /api/usuarios/login - status: 401 - 72ms
```

### Jerarquía de Niveles

El sistema utiliza **6 niveles personalizados** ordenados de mayor a menor criticidad:

| Nivel | Uso | Ejemplo |
|-------|-----|---------|
| `fatal` | Errores que impiden el funcionamiento del sistema | Error critico conectando a la base de datos |
| `error` | Excepciones del sistema capturadas en catch | Error en el login: SQLITE_ERROR |
| `warn` | Errores causados por el usuario / validaciones fallidas | Intento de login con contraseña incorrecta |
| `info` | Camino feliz — operaciones exitosas | Nuevo usuario registrado exitosamente |
| `debug` | Datos técnicos de depuración (peticiones entrantes, etc.) | Petición de registro recibida - email: x@y.com |
| `trace` | Nivel más fino de seguimiento (reservado) | — |

**Configuración del nivel**: Se controla con la variable de entorno `LOG_LEVEL` en `.env`:

```env
LOG_LEVEL=debug    # En desarrollo (muestra todo)
LOG_LEVEL=info     # En producción (solo info, warn, error y fatal)
```

### Cobertura de Endpoints

Los logs están implementados en **todos los endpoints core** del sistema:

| Endpoint | Niveles usados |
|----------|----------------|
| `POST /api/usuarios/registro` | `debug`, `info`, `warn`, `error` |
| `POST /api/usuarios/login` | `debug`, `info`, `warn`, `error` |
| `POST /api/usuarios/cambiar-password` | `debug`, `info`, `warn`, `error` |
| `PUT /api/usuarios/cambiar-rol` | `debug`, `info`, `warn`, `error` |
| `POST /api/expedientes/crear` | `debug`, `info`, `warn`, `error` |
| `GET /api/expedientes/buscar/:id` | `debug`, `info`, `warn`, `error` |
| `POST /api/consultas/crear` | `debug`, `info`, `warn`, `error` |
| `GET /api/consultas/buscar/:expediente_id` | `debug`, `info`, `warn`, `error` |
| Conexión a BD | `info`, `fatal` |
| Middleware de autenticación | `warn` |
| Middleware de roles | `warn` |

Adicionalmente, el middleware `requestLogger` registra **todas las peticiones HTTP** con nivel dinámico:
- `debug` para respuestas exitosas (2xx)
- `warn` para errores de cliente (4xx)
- `error` para errores de servidor (5xx)

### Seguridad de la Información / OWASP

El logger implementa un **filtro de sanitización automático** que previene la fuga de datos sensibles:

| Dato protegido | Método de protección |
|----------------|---------------------|
| **Contraseñas** | NUNCA se loguean en texto plano. El filtro reemplaza valores de claves como `password`, `nuevaPassword` con `***FILTERED***` |
| **Tokens JWT** | Cualquier token con formato `eyJ...` se reemplaza por `JWT_***FILTERED***` |
| **Tarjetas de crédito** | Claves como `credit_card`, `tarjeta`, `cvv` se filtran automáticamente |
| **Headers de autorización** | El valor del header `authorization` se filtra automáticamente |
| **Secretos** | Cualquier clave `secret` se filtra automáticamente |

**Claves filtradas**: `password`, `nuevaPassword`, `token`, `authorization`, `credit_card`, `tarjeta`, `cvv`, `secret`

**Ejemplo de filtrado:**

```
// El código loguea:
logger.debug(`Login data: ${JSON.stringify(req.body)}`);

// En el archivo .log aparece (la contraseña es filtrada):
[2026-03-28 09:30:22] | DEBUG | Login data: {"email":"doctor@hospital.com","password":"***FILTERED***"}
```

### Visualización de Logs

#### Endpoint: `GET /api/logs/ver`

Permite a un usuario con rol **admin** visualizar el contenido de los archivos de log directamente desde la API.

- **Requiere**: JWT + rol admin
- **Parámetros query**:
  - `file`: `combined` (default) o `error`
  — `lines`: Número de últimas líneas a mostrar (default: 100)

```bash
# Ver las últimas 100 líneas del log combinado
curl -H "Authorization: Bearer <token_admin>" http://localhost:3000/api/logs/ver

# Ver las últimas 50 líneas del log de errores
curl -H "Authorization: Bearer <token_admin>" "http://localhost:3000/api/logs/ver?file=error&lines=50"
```

Respuesta:

```json
{
  "message": "Últimas 15 líneas de combined.log",
  "archivo": "combined.log",
  "total_lineas": 15,
  "lineas_mostradas": 15,
  "logs": [
    "[2026-03-28 09:30:15] | INFO | Servidor corriendo en http://localhost:3000",
    "[2026-03-28 09:30:15] | INFO | Conectado a la base de datos SQLite",
    "..."
  ]
}
```

#### Archivo físico

Los archivos de log también se pueden consultar directamente en el sistema de archivos:

```bash
# Ver log combinado
cat logs/combined.log

# Ver solo errores
cat logs/error.log

# Seguir logs en tiempo real
tail -f logs/combined.log
```

---

## Estructura del proyecto (actualizada)

```
src/
  server.js                    # Punto de entrada: configura Express y monta las rutas
  config/
    database.js                # Conexión centralizada a SQLite
  constants/
    config.js                  # Variables de entorno (JWT_SECRET, PORT, LOG_LEVEL, etc.)
  middleware/
    auth.js                    # Middlewares: verificarToken, verificarRol
  middlewares/
    requestLogger.js           # Middleware: registra todas las peticiones HTTP con nivel dinámico
  utils/
    generateToken.js           # Generación y verificación de tokens JWT
    logger.js                  # Configuración centralizada de Winston (formato, niveles, OWASP filter)
  routes/
    auth.routes.js             # Rutas de autenticación y usuarios
    expediente.routes.js       # Rutas de expedientes clínicos
    consulta.routes.js         # Rutas de consultas médicas
    logs.routes.js             # Ruta de visualización de logs (solo admin)
logs/
  combined.log                 # Todos los registros del sistema
  error.log                    # Solo registros de nivel error y fatal
db/
  init.sql                     # Script SQL para inicializar las tablas
  usuarios.db                  # Base de datos SQLite (generada)
```

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
| **Logging seguro (OWASP)** | Filtro automático de contraseñas, JWT, tarjetas y secretos en logs |
| **Logs persistentes** | Winston con transporte a archivos `combined.log` y `error.log` |
