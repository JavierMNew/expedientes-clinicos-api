const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const db = new sqlite3.Database(
  path.join(__dirname, "../../db/usuarios.db"),
  (err) => {
    if (err) {
      console.error("Error conectando a la base de datos:", err.message);
    } else {
      console.log("Conectado a la base de datos SQLite");
      // Crear tablas automáticamente al conectar
      const initSQL = fs.readFileSync(
        path.join(__dirname, "../../db/init.sql"),
        "utf8"
      );
      db.exec(initSQL, (err) => {
        if (err) {
          console.error("Error creando tablas:", err.message);
        } else {
          console.log("Tablas inicializadas correctamente");
        }
      });
    }
  },
);

module.exports = db;
