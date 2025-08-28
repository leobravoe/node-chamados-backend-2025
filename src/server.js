// server.js
import express from "express";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

// listar produtos
app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
  res.json(result.rows);
});

// criar produto
app.post("/produtos", async (req, res) => {
  const { nome, preco } = req.body;
  const result = await pool.query(
    "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
    [nome, preco]
  );
  res.json(result.rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
