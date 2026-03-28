const logger = require('../utils/logger');

/**
 * Middleware que registra TODAS las peticiones HTTP con nivel dinámico:
 *  - debug  → respuestas exitosas (2xx)
 *  - warn   → errores de cliente (4xx)
 *  - error  → errores de servidor (5xx)
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const message = `[${req.method}] ${req.originalUrl} - status: ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(message);
    } else if (statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.debug(message);
    }
  });

  next();
};

module.exports = requestLogger;
