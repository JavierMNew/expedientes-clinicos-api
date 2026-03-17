const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const db = new sqlite3.Database(
  path.join(__dirname, "../../db/usuarios.db"),
  (err) => {
    if (err) {
      logger.fatal("Error conectando a la base de datos:", err.message);
    } else {
      logger.info("Conectado a la base de datos SQLite");
      // Crear tablas automáticamente al conectar
      const initSQL = fs.readFileSync(
        path.join(__dirname, "../../db/init.sql"),
        "utf8"
      );
      db.exec(initSQL, (err) => {
        if (err) {
          logger.fatal("Error creando tablas:", err.message);
        } else {
          logger.info("Tablas inicializadas correctamente");
        }
      });
    }
  },
);

module.exports = db;
