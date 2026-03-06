const express = require("express");
const validator = require("validator");
const db = require("../config/database");
const { verificarToken, verificarRol } = require("../middleware/auth");

const router = express.Router();

// ============================================
// POST /crear - Crear un nuevo expediente clínico
// Requiere: JWT + rol doctor o admin
// ============================================
router.post("/crear", verificarToken, verificarRol(["doctor", "admin"]), async (req, res) => {
  try {
    let { nombre_paciente, fecha_nacimiento, sexo, tipo_sangre, alergias, antecedentes } = req.body;

    // Validar nombre del paciente
    if (!nombre_paciente || typeof nombre_paciente !== "string") {
      return res.status(400).json({ error: "El nombre del paciente es requerido" });
    }

    if (!validator.isLength(nombre_paciente, { min: 2, max: 150 })) {
      return res.status(400).json({ error: "El nombre debe tener entre 2 y 150 caracteres" });
    }

    // Sanitizar nombre para prevenir XSS
    nombre_paciente = validator.escape(nombre_paciente);

    // Validar fecha de nacimiento (formato YYYY-MM-DD)
    if (!fecha_nacimiento || !validator.isDate(fecha_nacimiento, { format: 'YYYY-MM-DD' })) {
      return res.status(400).json({ error: "Fecha de nacimiento inválida. Formato: YYYY-MM-DD" });
    }

    // Validar sexo
    const sexosValidos = ["M", "F"];
    if (!sexo || !sexosValidos.includes(sexo)) {
      return res.status(400).json({ error: "Sexo inválido. Valores permitidos: M, F" });
    }

    // Validar tipo de sangre
    const tiposSangre = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    if (!tipo_sangre || !tiposSangre.includes(tipo_sangre)) {
      return res.status(400).json({
        error: "Tipo de sangre inválido",
        tiposPermitidos: tiposSangre,
      });
    }

    // Sanitizar campos opcionales
    if (alergias && typeof alergias === "string") {
      alergias = validator.escape(alergias);
    } else {
      alergias = "Ninguna";
    }

    if (antecedentes && typeof antecedentes === "string") {
      antecedentes = validator.escape(antecedentes);
    } else {
      antecedentes = "Ninguno";
    }

    // Obtener el ID del doctor que está creando el expediente (desde el JWT)
    const creado_por = req.usuario.id;

    // Insertar expediente con consulta parametrizada (Anti-SQLi)
    const sql = `
      INSERT INTO expedientes (nombre_paciente, fecha_nacimiento, sexo, tipo_sangre, alergias, antecedentes, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await new Promise((resolve, reject) => {
      db.run(sql, [nombre_paciente, fecha_nacimiento, sexo, tipo_sangre, alergias, antecedentes, creado_por], function (err) {
        if (err) reject(err);
        resolve({ id: this.lastID });
      });
    });

    res.status(201).json({
      message: "Expediente clínico creado exitosamente",
      expediente: {
        id: result.id,
        nombre_paciente,
        fecha_nacimiento,
        sexo,
        tipo_sangre,
        alergias,
        antecedentes,
        creado_por,
      },
    });
  } catch (error) {
    console.error("Error al crear expediente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ============================================
// GET /buscar/:id - Buscar expediente por ID
// Requiere: JWT
// ============================================
router.get("/buscar/:id", verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Validar que el ID sea un entero positivo
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de expediente inválido" });
    }

    // Consulta parametrizada (Anti-SQLi)
    const expediente = await new Promise((resolve, reject) => {
      db.get(
        "SELECT e.*, u.nombre_completo AS doctor_creador FROM expedientes e JOIN usuarios u ON e.creado_por = u.id WHERE e.id = ?",
        [id],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!expediente) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    res.status(200).json({
      message: "Expediente encontrado",
      expediente,
    });
  } catch (error) {
    console.error("Error al buscar expediente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
