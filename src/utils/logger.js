const winston = require('winston');

// Definición de niveles personalizados como solicitaste:
// rastro (trace), depurar (debug), informacion (info), advertir (warn), error y fatal
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

// Configurar colores de winston para nuestros niveles
winston.addColors(customLevels.colors);

// Crear el formato de nuestros logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`;
  })
);

// Crear y configurar el logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info', // Nivel por defecto
  format: logFormat,
  transports: [
    // Mostrar en consola con colores
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        logFormat
      )
    }),
    // Guardar errores y fatal en un archivo
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // Guardar todos los logs (hasta el nivel configurado) en otro archivo
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

module.exports = logger;
