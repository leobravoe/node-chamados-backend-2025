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

// Rota GET /api/chamados
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

// Rota GET /api/chamados/1
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
    // Extrai do corpo os campos esperados; se req.body vier undefined, usa objeto vazio
    const { texto, estado } = req.body ?? {};

    // ID do usuário autenticado, preenchido previamente pelo authMiddleware (req.user)
    const uid = req.user?.id;

    // Estado padrão: se não vier no corpo, assume "a" (aberto)
    const est = estado ?? "a";

    // Se um arquivo foi enviado no campo "imagem", monta a URL pública para acessá-lo;
    // caso contrário, mantém null
    const url_imagem = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

    // Validações mínimas: texto precisa ser string não vazia
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";
    // Estado precisa ser "a" (aberto) ou "f" (fechado)
    const temEstadoValido = (est === "a" || est === "f");

    // Se falhar alguma validação, apaga o arquivo salvo (se houver) e retorna 400
    if (!temTextoValido || !temEstadoValido) {
        if (req.file?.path) await unlink(req.file?.path);
        return res.status(400).json({
            erro:
                "Campos obrigatórios: texto (string) e estado ('a' ou 'f' — se ausente, assume 'a')",
        });
    }

    try {
        // Insere o chamado no banco, vinculando ao usuário autenticado (uid)
        // e salvando texto, estado e URL da imagem (ou null)
        const { rows } = await pool.query(
            `INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado", "url_imagem")
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [uid, texto.trim(), est, url_imagem]
        );

        // Retorna o registro recém-criado com status 201 (Created)
        res.status(201).json(rows[0]);
    } catch {
        // Em caso de erro no banco, remove o arquivo salvo para não deixar lixo
        if (req.file?.path) await unlink(req.file?.path);
        // Retorna erro genérico de servidor
        res.status(500).json({ erro: "erro interno" });
    }
});

// Rota PUT /api/chamados/1
router.put("/:id", async (req, res) => {
    // Converte o parâmetro de rota "id" para número (ex.: "/api/chamados/1")
    const id = Number(req.params.id);

    // Extrai os campos obrigatórios do corpo; se req.body vier undefined, usa objeto vazio
    const { texto, estado, url_imagem } = req.body ?? {};

    // ID do usuário autenticado (preenchido pelo authMiddleware em req.user)
    const uid = req.user?.id;

    // Flag de autorização: considera admin quando papel == 1
    const isAdmin = req.user?.papel == 1;

    // Validação do parâmetro: precisa ser inteiro positivo
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    // Validações do corpo para PUT (substituição completa dos campos principais)
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";
    const temEstadoValido = (estado === "a" || estado === "f");

    // PUT exige enviar todos os campos obrigatórios (texto e estado); imagem é opcional
    if (!temTextoValido || !temEstadoValido) {
        return res.status(400).json({
            erro: "Para PUT, envie todos os campos: texto (string), estado ('a' | 'f') e imagem (opcional)",
        });
    }

    try {
        // Atualiza o chamado:
        // - define texto, estado e url_imagem (ou null se ausente)
        // - marca data_atualizacao = now()
        // - restringe a atualização ao dono do registro (Usuarios_id = uid) OU a administradores
        const { rows } = await pool.query(
            `UPDATE "Chamados"
                 SET "texto"       = $1,
                     "estado"      = $2,
                     "url_imagem"   = $3,
                     "data_atualizacao" = now()
             WHERE "id" = $4 and
                  ("Usuarios_id" = $5 or $6)
             RETURNING *`,
            [texto.trim(), estado, url_imagem ?? null, id, uid, isAdmin]
        );

        // Se nenhum registro foi atualizado, retorna 404 (não encontrado ou sem permissão)
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        // Retorna o registro atualizado
        res.json(rows[0]);
    } catch {
        // Em qualquer erro de banco/servidor, responde com 500 genérico
        res.status(500).json({ erro: "erro interno" });
    }
});

// Rota PATCH /api/chamados/1
router.patch("/:id", async (req, res) => {
    // Converte o parâmetro de rota para número (ex.: "/api/chamados/1")
    const id = Number(req.params.id);

    // Extrai os campos opcionais do corpo; se req.body vier undefined, usa {}
    const { texto, estado, url_imagem } = req.body ?? {};

    // ID do usuário autenticado (preenchido pelo authMiddleware em req.user)
    const uid = req.user?.id;
    // Flag de autorização: considera admin quando papel == 1
    const isAdmin = req.user?.papel == 1;

    // Validação do parâmetro: precisa ser inteiro positivo
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    // Para PATCH, exige pelo menos um campo a atualizar
    if (
        texto === undefined &&
        estado === undefined &&
        url_imagem === undefined
    ) {
        return res.status(400).json({ erro: "envie ao menos um campo para atualizar" });
    }

    // Se "texto" foi enviado, valida que é string não vazia; guarda versão aparada
    let novoTexto = null;
    if (texto !== undefined) {
        if (typeof texto !== "string" || texto.trim() === "") {
            return res.status(400).json({ erro: "texto deve ser string não vazia" });
        }
        novoTexto = texto.trim();
    }

    // Se "estado" foi enviado, valida que é "a" (aberto) ou "f" (fechado)
    let novoEstado = null;
    if (estado !== undefined) {
        if (!(estado === "a" || estado === "f")) {
            return res.status(400).json({ erro: "estado deve ser 'a' ou 'f'" });
        }
        novoEstado = estado;
    }

    // Se "url_imagem" não foi enviado, mantém null para não alterar; se foi, usa o valor informado
    const novaUrl = url_imagem === undefined ? null : url_imagem;

    try {
        // Atualiza apenas os campos enviados:
        // - COALESCE($1, "texto") mantém o valor atual quando $1 é null (campo não enviado)
        // - idem para "estado" e "url_imagem"
        // - data_atualizacao recebe now()
        // Regra de autorização: só permite quando o registro é do usuário (Usuarios_id = uid) OU o usuário é admin
        const { rows } = await pool.query(
            `UPDATE "Chamados"
                 SET "texto"            = COALESCE($1, "texto"),
                     "estado"           = COALESCE($2, "estado"),
                     "url_imagem"       = COALESCE($3, "url_imagem"),
                     "data_atualizacao" = now()
             WHERE "id" = $4 and
                  ("Usuarios_id" = $5 or $6)
             RETURNING *`,
            [novoTexto, novoEstado, novaUrl, id, uid, isAdmin]
        );

        // Se nenhum registro foi atualizado, pode ser inexistente ou sem permissão → 404
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        // Retorna o registro atualizado
        res.json(rows[0]);
    } catch {
        // Em erro inesperado (banco/servidor), responde 500
        res.status(500).json({ erro: "erro interno" });
    }
});

// Rota DELETE /api/chamados/1
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    // ID do usuário autenticado (preenchido pelo authMiddleware em req.user)
    const uid = req.user?.id;
    // Flag de autorização: considera admin quando papel == 1
    const isAdmin = req.user?.papel == 1;

    try {
        const r = await pool.query(
            `DELETE FROM "Chamados" 
            WHERE "id" = $1 and 
                 ("Usuarios_id" = $2 or $3)
            RETURNING "id"`,
            [id, uid, isAdmin]
        );
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

export default router;