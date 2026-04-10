const express = require("express");
const { PORT } = require("./constants/config");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const expedienteRoutes = require("./routes/expediente.routes");
const consultaRoutes = require("./routes/consulta.routes");
const logsRoutes = require("./routes/logs.routes");

// Importar utilidades de logging
const logger = require("./utils/logger");
const requestLogger = require("./middlewares/requestLogger");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// 1. Seguridad de Encabezados (Fix: Information Exposure X-Powered-By)
// Helmet oculta X-Powered-By y configura otros headers de seguridad (HSTS, CSP, etc.)
app.use(helmet());

// 2. Rate Limiting Global (Fix: Allocation of Resources Without Limits)
// Limita a 100 peticiones cada 15 minutos por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones desde esta IP, intente de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Middleware para parsear JSON
app.use(express.json());

// Middleware para registrar todas las peticiones
app.use(requestLogger);

// Registrar rutas bajo /api/
app.use("/api/usuarios", authRoutes);
app.use("/api/expedientes", expedienteRoutes);
app.use("/api/consultas", consultaRoutes);
app.use("/api/logs", logsRoutes);

// Ruta raíz informativa
app.get("/", (req, res) => {
  res.json({
    message: "API de Expedientes Clínicos",
    version: "1.0.0",
    endpoints: {
      registro: "POST /api/usuarios/registro",
      login: "POST /api/usuarios/login",
      crearExpediente: "POST /api/expedientes/crear",
      buscarExpediente: "GET /api/expedientes/buscar/:id",
      crearConsulta: "POST /api/consultas/crear",
      buscarConsultas: "GET /api/consultas/buscar/:expediente_id",
    },
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  logger.info(`Servidor corriendo en http://localhost:${PORT}`);
});