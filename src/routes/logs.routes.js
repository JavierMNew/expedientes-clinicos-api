const express = require('express');
const fs = require('fs');
const path = require('path');
const { verificarToken, verificarRol } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const LOGS_DIR = path.join(__dirname, '../../logs');

// ============================================
// GET /ver - Visualizar el contenido del archivo de logs
// Requiere: JWT + rol admin
// Parámetros query opcionales:
//   ?file=combined (default) | error
//   ?lines=100 (últimas N líneas, default: 100)
// ============================================
router.get('/ver', verificarToken, verificarRol(['admin']), (req, res) => {
  try {
    const allowedFiles = ['combined', 'error'];
    const requestedFile = req.query.file || 'combined';
    const lines = parseInt(req.query.lines) || 100;

    logger.debug(`Solicitud de visualización de logs - archivo: ${requestedFile}.log, líneas: ${lines}, solicitado por: ${req.usuario.email}`);

    // Validar nombre de archivo (prevenir path traversal)
    if (!allowedFiles.includes(requestedFile)) {
      logger.warn(`Intento de acceder a archivo de log no permitido: ${requestedFile} por ${req.usuario.email}`);
      return res.status(400).json({
        error: 'Archivo no permitido',
        archivosPermitidos: allowedFiles
      });
    }

    const logFilePath = path.join(LOGS_DIR, `${requestedFile}.log`);

    // Verificar que el archivo existe
    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({
        error: 'Archivo de log no encontrado',
        archivo: `${requestedFile}.log`
      });
    }

    // Leer el archivo y devolver las últimas N líneas
    const content = fs.readFileSync(logFilePath, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    const lastLines = allLines.slice(-lines);

    logger.info(`Archivo de logs ${requestedFile}.log visualizado por admin ${req.usuario.email} (${lastLines.length} líneas)`);

    res.status(200).json({
      message: `Últimas ${lastLines.length} líneas de ${requestedFile}.log`,
      archivo: `${requestedFile}.log`,
      total_lineas: allLines.length,
      lineas_mostradas: lastLines.length,
      logs: lastLines
    });
  } catch (error) {
    logger.error(`Error al leer archivo de logs: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: 'Error al leer el archivo de logs' });
  }
});

module.exports = router;
