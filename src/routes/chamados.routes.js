// src/routes/chamados.routes.js
import { Router } from "express";
import { unlink } from 'node:fs/promises'; // unlink do fs para apagar arquivo
import { pool } from "../database/db.js";
import multer from "multer"; // import do multer
import path from "path";     // import do path
import fs from "fs";         // import do fs

const router = Router();

// setup mínimo de upload em disco
const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// Rota /api/chamados
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM "Chamados" ORDER BY "id" DESC`
        );
        res.json(rows);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// Rota /api/chamados/1
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const { rows } = await pool.query(
            `SELECT * FROM "Chamados" WHERE "id" = $1`,
            [id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// Rota POST /api/chamados
router.post("/", upload.single("imagem"), async (req, res) => {
    const { Usuarios_id, texto, estado } = req.body ?? {};

    const uid = Number(Usuarios_id);
    const est = estado ?? "a";
    // Configura a url da imagem
    const url_imagem = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

    const temUidValido = Number.isInteger(uid) && uid > 0;
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";
    const temEstadoValido = (est === "a" || est === "f");

    if (!temUidValido || !temTextoValido || !temEstadoValido) {
        if(req.file?.path) await unlink(req.file?.path);
        return res.status(400).json({
            erro:
                "Campos obrigatórios: Usuarios_id (inteiro>0), texto (string) e estado ('a' ou 'f' — se ausente, assume 'a')",
        });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado", "url_imagem")
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [uid, texto.trim(), est, url_imagem]
        );
        res.status(201).json(rows[0]);
    } catch {
        if(req.file?.path) await unlink(req.file?.path);
        res.status(500).json({ erro: "erro interno" });
    }
});

router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, url_imagem } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    const uid = Number(Usuarios_id);
    const temUidValido = Number.isInteger(uid) && uid > 0;
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";
    const temEstadoValido = (estado === "a" || estado === "f");

    if (!temUidValido || !temTextoValido || !temEstadoValido) {
        return res.status(400).json({
            erro: "Para PUT, envie todos os campos: Usuarios_id (inteiro>0), texto (string), estado ('a' | 'f') e url_imagem (opcional)",
        });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE "Chamados"
                 SET "Usuarios_id" = $1,
                     "texto"       = $2,
                     "estado"      = $3,
                     "url_imagem"   = $4,
                     "data_atualizacao" = now()
             WHERE "id" = $5
             RETURNING *`,
            [uid, texto.trim(), estado, url_imagem ?? null, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

router.patch("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, url_imagem } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    if (
        Usuarios_id === undefined &&
        texto === undefined &&
        estado === undefined &&
        url_imagem === undefined
    ) {
        return res.status(400).json({ erro: "envie ao menos um campo para atualizar" });
    }

    let uid = null;
    if (Usuarios_id !== undefined) {
        uid = Number(Usuarios_id);
        if (!Number.isInteger(uid) || uid <= 0) {
            return res.status(400).json({ erro: "Usuarios_id deve ser inteiro > 0" });
        }
    }

    let novoTexto = null;
    if (texto !== undefined) {
        if (typeof texto !== "string" || texto.trim() === "") {
            return res.status(400).json({ erro: "texto deve ser string não vazia" });
        }
        novoTexto = texto.trim();
    }

    let novoEstado = null;
    if (estado !== undefined) {
        if (!(estado === "a" || estado === "f")) {
            return res.status(400).json({ erro: "estado deve ser 'a' ou 'f'" });
        }
        novoEstado = estado;
    }

    const novaUrl = url_imagem === undefined ? null : url_imagem;

    try {
        const { rows } = await pool.query(
            `UPDATE "Chamados"
                 SET "Usuarios_id"      = COALESCE($1, "Usuarios_id"),
                     "texto"            = COALESCE($2, "texto"),
                     "estado"           = COALESCE($3, "estado"),
                     "url_imagem"       = COALESCE($4, "url_imagem"),
                     "data_atualizacao" = now()
             WHERE "id" = $5
             RETURNING *`,
            [uid, novoTexto, novoEstado, novaUrl, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const r = await pool.query(
            `DELETE FROM "Chamados" WHERE "id" = $1 RETURNING "id"`,
            [id]
        );
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

export default router;