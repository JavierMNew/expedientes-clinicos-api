const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Conectar a la base de datos SQLite
const db = new sqlite3.Database(path.join(__dirname, '../db/usuarios.db'), (err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
    }
});

// Endpoint de registro
app.post('/registro', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que los datos existan
        if (!email || !password) {
            return res.status(400).json({ error: 'Credenciales Invalidas' });
        }

        // Validar longitud de la contraseña
        if (password.length <= 8 || password.length >= 10) {
            return res.status(400).json({ error: 'Credenciales Invalidas' });
        }

        // Verificar si el email ya existe en la BD
        const usuarioExistente = await new Promise((resolve, reject) => {
            db.get('SELECT email FROM usuarios WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (usuarioExistente) {
            return res.status(409).json({ error: 'El usuario ya existe' });
        }

        // Generar hash de la contraseña con bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insertar nuevo usuario en la BD
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO usuarios (email, password) VALUES (?, ?)',
                [email, hashedPassword],
                function(err) {
                    if (err) reject(err);
                    resolve(this);
                }
            );
        });

        // Éxito - Usuario registrado
        res.status(201).json({ 
            message: 'Usuario Registrado',
            user: { email } // Devolvemos el correo como confirmación
        });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});