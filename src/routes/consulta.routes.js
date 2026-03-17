const express = require("express");
const validator = require("validator");
const db = require("../config/database");
const { verificarToken, verificarRol } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

// ============================================
// POST /crear - Registrar una nueva consulta médica
// Requiere: JWT + rol doctor o admin
// ============================================
router.post("/crear", verificarToken, verificarRol(["doctor", "admin"]), async (req, res) => {
    try {
        let { expediente_id, motivo, diagnostico, tratamiento, notas } = req.body;

        // Validar ID de expediente
        if (!Number.isInteger(expediente_id) || expediente_id <= 0) {
            logger.warn(`Intento de crear consulta con ID de expediente inválido (${expediente_id}) por ${req.usuario.email}`);
            return res.status(400).json({ error: "expediente_id inválido" });
        }

        // Validar motivo de consulta
        if (!motivo || typeof motivo !== "string") {
            return res.status(400).json({ error: "El motivo de la consulta es requerido" });
        }
        if (!validator.isLength(motivo, { min: 3, max: 500 })) {
            return res.status(400).json({ error: "El motivo debe tener entre 3 y 500 caracteres" });
        }

        // Validar diagnóstico
        if (!diagnostico || typeof diagnostico !== "string") {
            return res.status(400).json({ error: "El diagnóstico es requerido" });
        }
        if (!validator.isLength(diagnostico, { min: 3, max: 1000 })) {
            return res.status(400).json({ error: "El diagnóstico debe tener entre 3 y 1000 caracteres" });
        }

        // Validar tratamiento
        if (!tratamiento || typeof tratamiento !== "string") {
            return res.status(400).json({ error: "El tratamiento es requerido" });
        }
        if (!validator.isLength(tratamiento, { min: 3, max: 1000 })) {
            return res.status(400).json({ error: "El tratamiento debe tener entre 3 y 1000 caracteres" });
        }

        // Sanitizar todos los campos de texto para prevenir XSS
        motivo = validator.escape(motivo);
        diagnostico = validator.escape(diagnostico);
        tratamiento = validator.escape(tratamiento);

        if (notas && typeof notas === "string") {
            notas = validator.escape(notas);
        } else {
            notas = "";
        }

        // Verificar que el expediente existe (consulta parametrizada)
        const expedienteExiste = await new Promise((resolve, reject) => {
            db.get(
                "SELECT id FROM expedientes WHERE id = ?",
                [expediente_id],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!expedienteExiste) {
            logger.warn(`Intento de crear consulta en expediente inexistente (ID: ${expediente_id}) por ${req.usuario.email}`);
            return res.status(404).json({ error: "Expediente no encontrado" });
        }

        // Obtener el ID del doctor desde el JWT
        const doctor_id = req.usuario.id;

        // Insertar consulta con consulta parametrizada (Anti-SQLi)
        const sql = `
      INSERT INTO consultas (expediente_id, doctor_id, motivo, diagnostico, tratamiento, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        const result = await new Promise((resolve, reject) => {
            db.run(sql, [expediente_id, doctor_id, motivo, diagnostico, tratamiento, notas], function (err) {
                if (err) reject(err);
                resolve({ id: this.lastID });
            });
        });

        logger.info(`Nueva consulta (ID: ${result.id}) registrada exitosamente en expediente ${expediente_id} por doctor_id ${doctor_id}`);
        res.status(201).json({
            message: "Consulta médica registrada exitosamente",
            consulta: {
                id: result.id,
                expediente_id,
                doctor_id,
                motivo,
                diagnostico,
                tratamiento,
                notas,
            },
        });
    } catch (error) {
        logger.error("Error al crear consulta:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ============================================
// GET /buscar/:expediente_id - Listar consultas de un expediente
// Requiere: JWT
// ============================================
router.get("/buscar/:expediente_id", verificarToken, async (req, res) => {
    try {
        const expediente_id = parseInt(req.params.expediente_id);

        // Validar que el ID sea un entero positivo
        if (!Number.isInteger(expediente_id) || expediente_id <= 0) {
            logger.warn(`Intento de buscar consultas con ID de expediente inválido (${expediente_id}) por ${req.usuario.email}`);
            return res.status(400).json({ error: "expediente_id inválido" });
        }

        // Verificar que el expediente existe (consulta parametrizada)
        const expedienteExiste = await new Promise((resolve, reject) => {
            db.get(
                "SELECT id FROM expedientes WHERE id = ?",
                [expediente_id],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!expedienteExiste) {
            logger.info(`Búsqueda de consultas en expediente no encontrado (ID: ${expediente_id}) por ${req.usuario.email}`);
            return res.status(404).json({ error: "Expediente no encontrado" });
        }

        // Obtener todas las consultas del expediente (consulta parametrizada)
        const consultas = await new Promise((resolve, reject) => {
            db.all(
                "SELECT c.*, u.nombre_completo AS nombre_doctor FROM consultas c JOIN usuarios u ON c.doctor_id = u.id WHERE c.expediente_id = ? ORDER BY c.fecha_consulta DESC",
                [expediente_id],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });

        res.status(200).json({
            message: "Consultas encontradas",
            total: consultas.length,
            expediente_id,
            consultas,
        });
    } catch (error) {
        logger.error("Error al buscar consultas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;
