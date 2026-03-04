const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "../../db/usuarios.db"),
  (err) => {
    if (err) {
      console.error("Error conectando a la base de datos:", err.message);
    } else {
      console.log("Conectado a la base de datos SQLite");
    }
  },
);

module.exports = db;
