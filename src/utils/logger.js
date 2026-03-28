const winston = require('winston');
const path = require('path');

// ---------------------------------------------------------------------------
// Niveles personalizados de severidad (de mayor a menor criticidad)
// ---------------------------------------------------------------------------
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'cyan'
  }
};

winston.addColors(customLevels.colors);

// ---------------------------------------------------------------------------
// Lista de patrones sensibles que NUNCA deben llegar a los logs (OWASP)
// ---------------------------------------------------------------------------
const SENSITIVE_KEYS = ['password', 'nuevaPassword', 'token', 'authorization', 'credit_card', 'tarjeta', 'cvv', 'secret'];

/**
 * Filtra datos sensibles de un mensaje de log.
 * Si el mensaje contiene alguna clave sensible como valor,
 * la reemplaza con '***FILTERED***'.
 */
const sanitize = (message) => {
  if (typeof message !== 'string') return message;

  let sanitized = message;

  // Filtrar patrones tipo key=value o "key":"value"
  SENSITIVE_KEYS.forEach((key) => {
    // Patrón para JSON: "password":"valor"
    const jsonPattern = new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`, 'gi');
    sanitized = sanitized.replace(jsonPattern, `$1"***FILTERED***"`);

    // Patrón para key=valor en texto plano
    const plainPattern = new RegExp(`(${key}\\s*[=:]\\s*)\\S+`, 'gi');
    sanitized = sanitized.replace(plainPattern, `$1***FILTERED***`);
  });

  // Filtrar tokens JWT completos (formato: xxx.xxx.xxx)
  const jwtPattern = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  sanitized = sanitized.replace(jwtPattern, 'JWT_***FILTERED***');

  return sanitized;
};

// ---------------------------------------------------------------------------
// Formato requerido: [Fecha y Hora] | [Nivel de Severidad] | [Mensaje]
// ---------------------------------------------------------------------------
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const sanitizedMessage = sanitize(message);
    const metaString = Object.keys(meta).length ? ` ${sanitize(JSON.stringify(meta))}` : '';
    return `[${timestamp}] | ${level.toUpperCase()} | ${sanitizedMessage}${metaString}`;
  })
);

// ---------------------------------------------------------------------------
// Formato para consola (con colores)
// ---------------------------------------------------------------------------
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const sanitizedMessage = sanitize(message);
    const metaString = Object.keys(meta).length ? ` ${sanitize(JSON.stringify(meta))}` : '';
    return `[${timestamp}] | ${level} | ${sanitizedMessage}${metaString}`;
  })
);

// ---------------------------------------------------------------------------
// Ruta absoluta a la carpeta de logs (siempre relativa a la raíz del proyecto)
// ---------------------------------------------------------------------------
const logsDir = path.join(__dirname, '../../logs');

// ---------------------------------------------------------------------------
// Crear y configurar el logger
// ---------------------------------------------------------------------------
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'debug', // En desarrollo mostramos todo
  format: logFormat,
  transports: [
    // Consola con colores
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Archivo solo para errores y fatales
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    // Archivo con TODOS los logs (hasta el nivel configurado)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  ]
});

module.exports = logger;
