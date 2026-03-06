const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const db = require("../config/database");
const { generateToken } = require("../utils/generateToken");
const { verificarToken, verificarRol } = require("../middleware/auth");

const router = express.Router();

// ============================================
// POST /registro - Registro de nuevo usuario del sistema
// ============================================
router.post("/registro", async (req, res) => {
  try {
    const { email, password, nombre_completo } = req.body;

    // Validar que los datos existan
    if (!email || !password || !nombre_completo) {
      return res.status(400).json({ error: "Todos los campos son requeridos (email, password, nombre_completo)" });
    }

    // Validar formato de email con validator
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Formato de email inválido" });
    }

    // Validar longitud mínima de la contraseña (mínimo 8 caracteres)
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Validar nombre completo
    if (typeof nombre_completo !== "string" || !validator.isLength(nombre_completo, { min: 2, max: 150 })) {
      return res.status(400).json({ error: "El nombre completo debe tener entre 2 y 150 caracteres" });
    }

    // Verificar si el usuario ya existe (consulta parametrizada)
    const usuarioExistente = await new Promise((resolve, reject) => {
      db.get(
        "SELECT email FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (usuarioExistente) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    // Generar hash de la contraseña con bcrypt (nunca se guarda en texto plano)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Sanitizar el nombre para prevenir XSS
    const nombreSanitizado = validator.escape(nombre_completo);

    // Insertar nuevo usuario con consulta parametrizada (Anti-SQLi)
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO usuarios (email, password, nombre_completo) VALUES (?, ?, ?)",
        [email, hashedPassword, nombreSanitizado],
        function (err) {
          if (err) reject(err);
          resolve(this);
        },
      );
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: { email, nombre_completo: nombreSanitizado, role: "doctor" },
    });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ============================================
// POST /login - Inicio de sesión
// Retorna JWT firmado (sin contraseñas en el payload)
// ============================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los datos existan
    if (!email || !password) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    // Verificar si el email existe en la BD (consulta parametrizada)
    const usuario = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email, password, nombre_completo, role FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Comparar la contraseña ingresada con el hash almacenado (bcrypt)
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generar el token con JWT (payload solo contiene id, email, role - NO contraseña)
    const token = generateToken(usuario);

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token: token,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo,
        role: usuario.role,
      },
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ============================================
// POST /cambiar-password - Cambiar contraseña
// Requiere: JWT
// ============================================
router.post("/cambiar-password", verificarToken, async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;

    // Validar que el email del token coincida con el de la petición
    if (email !== req.usuario.email) {
      return res
        .status(403)
        .json({ error: "No puedes cambiar la contraseña de otro usuario" });
    }

    // Validar que los datos existan
    if (!email || !nuevaPassword) {
      return res
        .status(400)
        .json({ error: "Email y nueva contraseña son requeridos" });
    }

    // Validar longitud de la nueva contraseña
    if (typeof nuevaPassword !== "string" || nuevaPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Verificar que el usuario existe (consulta parametrizada)
    const usuarioExistente = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Generar hash de la nueva contraseña con bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

    // Actualizar la contraseña (consulta parametrizada)
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE usuarios SET password = ? WHERE email = ?",
        [hashedPassword, email],
        function (err) {
          if (err) reject(err);
          resolve(this);
        },
      );
    });

    res.status(200).json({
      message: "Contraseña actualizada exitosamente",
      user: { email },
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ============================================
// PUT /cambiar-rol - Cambiar rol de un usuario
// Requiere: JWT + rol admin
// ============================================
router.put("/cambiar-rol", verificarToken, verificarRol(["admin"]), async (req, res) => {
  try {
    const { email, nuevoRol } = req.body;

    // Validar que los datos existan
    if (!email || !nuevoRol) {
      return res
        .status(400)
        .json({ error: "Email y nuevo rol son requeridos" });
    }

    // Validar que el rol sea válido para el sistema clínico
    const rolesValidos = ["doctor", "admin", "enfermero"];
    if (!rolesValidos.includes(nuevoRol)) {
      return res.status(400).json({
        error: "Rol no válido",
        rolesPermitidos: rolesValidos,
      });
    }

    // Verificar que el usuario existe (consulta parametrizada)
    const usuarioExistente = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email, role FROM usuarios WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const rolAnterior = usuarioExistente.role;

    // Actualizar rol (consulta parametrizada)
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE usuarios SET role = ? WHERE email = ?",
        [nuevoRol, email],
        function (err) {
          if (err) reject(err);
          resolve(this);
        },
      );
    });

    res.status(200).json({
      message: "Rol actualizado exitosamente",
      user: {
        email,
        rolAnterior,
        rolNuevo: nuevoRol,
      },
    });
  } catch (error) {
    console.error("Error al cambiar rol:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
},
);

module.exports = router;
