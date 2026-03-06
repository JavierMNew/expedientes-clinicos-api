const express = require("express");
const { PORT } = require("./constants/config");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const expedienteRoutes = require("./routes/expediente.routes");
const consultaRoutes = require("./routes/consulta.routes");

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Registrar rutas bajo /api/
app.use("/api/usuarios", authRoutes);
app.use("/api/expedientes", expedienteRoutes);
app.use("/api/consultas", consultaRoutes);

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
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
