# API de aprendizaje sobre Seguridad en el Desarrollo de Aplicaciones

API inicial para registro de usuarios que almacena correos y hashes de contraseña en SQLite.

## Giro de la API

Esta API permite que un cliente envíe una solicitud POST a `/registro` con `email` y `password`.
El servidor valida los datos, comprueba la existencia del email en la base de datos, hashea la contraseña con `bcrypt` y almacena el email y el hash en una base de datos SQLite.

## Tecnologías principales

- Node.js
- Express
- SQLite (archivo local)
- bcrypt (para hashing de contraseñas)

## Dependencias (package.json)

- express
- sqlite3
- bcrypt

Instalación de dependencias:

```bash
npm install
```

## Reglas y comportamiento relevante

- El archivo de base de datos utilizado es `db/usuarios.db` (SQLite, sin servidor).
- Se usan `db.get()` para consultas que devuelven una fila y `db.run()` para `INSERT`, `UPDATE`, `DELETE`.
- Las consultas están parametrizadas (placeholders `?`) para prevenir SQL injection.
- La validación de contraseña en el servidor exige una longitud estricta: debe cumplir 8 < password < 10 (es decir, longitud válida = 9 caracteres).
- `bcrypt` se usa con `saltRounds = 10` para generar el hash almacenado.

## Inicializar la base de datos

Si quieres crear la tabla `usuarios`, hay un script SQL en `db/init.sql`. Puedes inicializar la base de datos con la utilidad `sqlite3` (si la tienes instalada):

```bash
sqlite3 db/usuarios.db < db/init.sql
```

Ejemplo de esquema esperado:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);
```

## Ejecutar la API

Iniciar el servidor:

```bash
node src/server.js
```

El servidor escucha por defecto en `http://localhost:3000`.

## Endpoint `/registro`

- Método: `POST`
- Ruta: `/registro`
- Payload JSON esperado:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "123456789"
}
```

Condiciones y respuestas principales:
- Si falta `email` o `password`: responde `400` con `{ error: 'Credenciales Invalidas' }`.
- Si la longitud de `password` no cumple 8 < len < 10: responde `400` con `{ error: 'Credenciales Invalidas' }`.
- Si el email ya existe: responde `409` con `{ error: 'El usuario ya existe' }`.
- En registro exitoso: responde `201` con `{ message: 'Usuario Registrado', user: { email } }`.


## Notas de seguridad y operación

- Las contraseñas nunca se almacenan en texto plano: solo se guarda el hash generado por `bcrypt`.
- Las consultas parametrizadas evitan inyección SQL.

