// server.js
import express from "express";
import { pool } from "./db.js";
const app = express();
app.use(express.json());
// ROTAS
app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /produtos",
            "MOSTRAR": "GET /produtos/:id",
            "CRIAR": "POST /produtos BODY: { nome: 'string', preco: Number }",
            "SUBSTITUIR": "PUT /produtos/:id BODY: { nome: 'string', preco: Number }",
            "ATUALIZAR": "PATCH /produtos/:id BODY: { nome: 'string' || preco: Number }",
            "DELETAR": "DELETE /produtos/:id",
        }
        res.json(rotas);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// LISTAR
app.get("/produtos", async (_req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
        res.json(rows);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// MOSTRAR (show)
app.get("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    try {
        const { rows } = await pool.query("SELECT * FROM produtos WHERE id = $1", [id]);
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// CRIAR
app.post("/produtos", async (req, res) => {
    const { nome, preco } = req.body ?? {};
    const p = Number(preco);
    // preco deve ser número >= 0
    if (!nome || preco == null || Number.isNaN(p) || p < 0) {
        return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
    }
    try {
        const { rows } = await pool.query(
            "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
            [nome, p]
        );
        res.status(201).json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// SUBSTITUIR (PUT) — envia todos os campos
app.put("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco } = req.body ?? {};
    const p = Number(preco);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    if (!nome || preco == null || Number.isNaN(p) || p < 0) {
        return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
    }
    try {
        const { rows } = await pool.query(
            "UPDATE produtos SET nome = $1, preco = $2 WHERE id = $3 RETURNING *",
            [nome, p, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// ATUALIZAR (PATCH) — envia só o que quiser
// COALESCE(a, b): devolve 'a' quando 'a' NÃO é NULL; caso seja NULL, devolve 'b'.
// Aqui: se não enviar um campo, passamos NULL e o COALESCE mantém o valor atual do banco.
app.patch("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco } = req.body ?? {};
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    if (nome === undefined && preco === undefined) return res.status(400).json({ erro: "envie nome e/ou preco" });
    // Se 'preco' foi enviado, precisa ser número >= 0
    let p = null;
    if (preco !== undefined) {
        p = Number(preco);
        if (Number.isNaN(p) || p < 0) {
            return res.status(400).json({ erro: "preco deve ser número >= 0" });
        }
    }
    try {
        const { rows } = await pool.query(
            "UPDATE produtos SET nome = COALESCE($1, nome), preco = COALESCE($2, preco) WHERE id = $3 RETURNING *",
            [nome ?? null, p, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// DELETAR
app.delete("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    try {
        const r = await pool.query("DELETE FROM produtos WHERE id = $1 RETURNING id", [id]);
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));