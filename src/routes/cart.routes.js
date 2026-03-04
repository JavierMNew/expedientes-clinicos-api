const express = require("express");
const db = require("../config/database");

const router = express.Router();

router.post("/agregar", async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;

    // Validar el id del usuario
    if (!Number.isInteger(user_id) || user_id <= 0) {
      return res.status(400).json({ error: "user_id inválido" });
    }

    // Validar el id del producto
    if (!Number.isInteger(product_id) || product_id <= 0) {
      return res.status(400).json({ error: "product_id inválido" });
    }

    // Validar la cantidad
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "quantity inválida" });
    }

    const usuarioExiste = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM usuarios WHERE id = ?",
        [user_id],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!usuarioExiste) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar que el producto existe
    const productoExiste = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, stock FROM products WHERE id = ?",
        [product_id],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        },
      );
    });

    if (!productoExiste) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Verificar que hay suficiente stock
    if (productoExiste.stock < quantity) {
      return res.status(400).json({
        error: "Stock insuficiente",
        stockDisponible: productoExiste.stock,
      });
    }

    const sql = `
      INSERT INTO cart (user_id, product_id, quantity)
      VALUES (?, ?, ?)
    `;

    const result = await new Promise((resolve, reject) => {
      db.run(sql, [user_id, product_id, quantity], function (err) {
        if (err) reject(err);
        resolve({ id: this.lastID });
      });
    });

    res.status(201).json({
      message: "Producto agregado al carrito",
      carrito: {
        id: result.id,
        user_id,
        product_id,
        quantity,
      },
    });
  } catch (error) {
    console.error("Error al agregar al carrito:", error);
    res.status(500).json({ error: "Error al insertar en carrito" });
  }
});

module.exports = router;
