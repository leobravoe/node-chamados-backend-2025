// routes/chamados.routes.js — rotas de CHAMADOS
// -----------------------------------------------------------------------------
// OBJETIVO DESTE ARQUIVO
// -----------------------------------------------------------------------------
// Reunir todas as rotas (endpoints) do recurso "Chamados" usando um Router
// do Express. No app principal, este Router será montado sob o prefixo
// /api/chamados. Ex.: app.use("/api/chamados", chamadosRouter)
//
// SOBRE A TABELA (resumo):
//   id              SERIAL PK
//   Usuarios_id     INTEGER NOT NULL  (FK -> Usuarios.id)
//   texto           VARCHAR(255) NOT NULL
//   estado          CHAR(1) NOT NULL  ('a' = aberto, 'f' = fechado)
//   urlImagem       VARCHAR(255) NULL
//   data_criacao    TIMESTAMP DEFAULT now()
//   data_atualizacao TIMESTAMP DEFAULT now()
//
// CONCEITOS-CHAVE (bem direto):
// - Router: "mini-app" de rotas relacionadas ao mesmo assunto (aqui: chamados).
// - req.params: parâmetros na URL (ex.: /:id).
// - req.body: JSON enviado pelo cliente (precisa de app.use(express.json()) no app).
// - pool.query(SQL, [valores]): executa SQL com parâmetros ($1, $2, ...).
// - RETURNING *: no INSERT/UPDATE, retorna a linha afetada (útil para responder).
// - Códigos HTTP: 200 OK, 201 Created, 204 No Content, 400 Bad Request,
//                 404 Not Found, 500 Internal Server Error.
// -----------------------------------------------------------------------------
import { Router } from "express";
import { pool } from "../database/db.js";
const router = Router(); // cria o "mini-app" de rotas
// Função utilitária simples para validar o campo "estado"
const isEstadoValido = (s) => s === "a" || s === "f";
// -----------------------------------------------------------------------------
// LISTAR — GET /api/chamados
// -----------------------------------------------------------------------------
// Objetivo: retornar TODOS os chamados.
// Obs.: Ordenamos por id DESC para mostrar os mais recentes primeiro.
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM chamados ORDER BY id DESC"
        );
        res.json(rows); // 200 OK (array de chamados)
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// -----------------------------------------------------------------------------
// MOSTRAR — GET /api/chamados/:id
// -----------------------------------------------------------------------------
// Objetivo: retornar UM chamado específico pelo id.
router.get("/:id", async (req, res) => {
    // req.params.id é string → converter p/ número
    const id = Number(req.params.id);
    // Validar: precisa ser inteiro e > 0
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    try {
        const { rows } = await pool.query(
            "SELECT * FROM chamados WHERE id = $1",
            [id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]); // 200 OK (um objeto)
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// -----------------------------------------------------------------------------
// CRIAR — POST /api/chamados
// -----------------------------------------------------------------------------
// Objetivo: inserir um novo chamado.
// Espera JSON: { Usuarios_id, texto, estado?, urlImagem? }
// Regras básicas:
// - Usuarios_id: inteiro > 0 (FK para Usuarios.id).
// - texto: string não vazia.
// - estado: 'a' ou 'f'. Se não mandar, vamos assumir 'a' (aberto).
// - urlImagem: opcional (string). Pode ser undefined/null.
router.post("/", async (req, res) => {
    // Se req.body vier undefined (cliente não mandou JSON), "?? {}" usa objeto vazio
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};
    // Convertendo tipos e validando entradas:
    const uid = Number(Usuarios_id);
    const temUidValido = Number.isInteger(uid) && uid > 0;
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";
    const est = estado ?? "a"; // se não enviar estado, padrão "a" (aberto)
    const temEstadoValido = isEstadoValido(est);
    if (!temUidValido || !temTextoValido || !temEstadoValido) {
        return res.status(400).json({
            erro:
                "Campos obrigatórios: Usuarios_id (inteiro>0), texto (string) e estado ('a' ou 'f' — se ausente, assume 'a')",
        });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO chamados (Usuarios_id, texto, estado, urlImagem)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [uid, texto.trim(), est, urlImagem ?? null]
        );
        // 201 Created + retornamos o chamado criado (inclui id gerado)
        res.status(201).json(rows[0]);
    } catch (e) {
        // Se a FK (Usuarios_id) não existir, o Postgres lança erro 23503
        if (e?.code === "23503") {
            return res
                .status(400)
                .json({ erro: "Usuarios_id não existe (violação de chave estrangeira)" });
        }
        res.status(500).json({ erro: "erro interno" });
    }
});
// -----------------------------------------------------------------------------
// SUBSTITUIR — PUT /api/chamados/:id
// -----------------------------------------------------------------------------
// Objetivo: substituir TODOS os campos do chamado (representação completa).
// Espera JSON completo: { Usuarios_id, texto, estado, urlImagem? }
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};
    // Valida id
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    // Valida campos
    const uid = Number(Usuarios_id);
    const temUidValido = Number.isInteger(uid) && uid > 0;
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";
    const temEstadoValido = isEstadoValido(estado);
    if (!temUidValido || !temTextoValido || !temEstadoValido) {
        return res.status(400).json({
            erro:
                "Para PUT, envie todos os campos: Usuarios_id (inteiro>0), texto (string), estado ('a' | 'f') e urlImagem (opcional)",
        });
    }
    try {
        const { rows } = await pool.query(
            `UPDATE chamados
                SET Usuarios_id = $1,
                    texto       = $2,
                    estado      = $3,
                    urlImagem   = $4,
                    data_atualizacao = now()
            WHERE id = $5
            RETURNING *`,
            [uid, texto.trim(), estado, urlImagem ?? null, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]); // 200 OK - chamado substituído
    } catch (e) {
        if (e?.code === "23503") {
            return res
                .status(400)
                .json({ erro: "Usuarios_id não existe (violação de chave estrangeira)" });
        }
        res.status(500).json({ erro: "erro interno" });
    }
});
// -----------------------------------------------------------------------------
// ATUALIZAR — PATCH /api/chamados/:id
// -----------------------------------------------------------------------------
// Objetivo: atualizar APENAS os campos enviados (parcial).
// Regras de validação:
// - Se enviar Usuarios_id, precisa ser inteiro > 0.
// - Se enviar texto, precisa ser string não vazia.
// - Se enviar estado, precisa ser 'a' ou 'f'.
// - Se não enviar nada, respondemos 400 (não há o que atualizar).
router.patch("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};
    // Valida id
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    // Se nenhum campo foi enviado, não faz sentido atualizar
    if (
        Usuarios_id === undefined &&
        texto === undefined &&
        estado === undefined &&
        urlImagem === undefined
    ) {
        return res.status(400).json({ erro: "envie ao menos um campo para atualizar" });
    }
    // Validar cada campo somente se ele foi enviado:
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
        if (!isEstadoValido(estado)) {
            return res.status(400).json({ erro: "estado deve ser 'a' ou 'f'" });
        }
        novoEstado = estado;
    }
    // urlImagem pode ser undefined (não mexe), string (atualiza) ou null (limpa)
    // Aqui, se não vier, passamos null para COALESCE manter o valor atual.
    const novaUrl = urlImagem === undefined ? null : urlImagem;
    try {
        const { rows } = await pool.query(
            `UPDATE chamados
                SET Usuarios_id      = COALESCE($1, Usuarios_id),
                    texto            = COALESCE($2, texto),
                    estado           = COALESCE($3, estado),
                    urlImagem        = COALESCE($4, urlImagem),
                    data_atualizacao = now()
            WHERE id = $5
            RETURNING *`,
            [uid, novoTexto, novoEstado, novaUrl, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]); // 200 OK - chamado atualizado parcialmente
    } catch (e) {
        if (e?.code === "23503") {
            return res
                .status(400)
                .json({ erro: "Usuarios_id não existe (violação de chave estrangeira)" });
        }
        res.status(500).json({ erro: "erro interno" });
    }
});
// -----------------------------------------------------------------------------
// DELETAR — DELETE /api/chamados/:id
// -----------------------------------------------------------------------------
// Objetivo: remover um chamado existente. Retorna 204 No Content se der certo.
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    try {
        const r = await pool.query(
            "DELETE FROM chamados WHERE id = $1 RETURNING id",
            [id]
        );
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
        res.status(204).end(); // 204 = sucesso, sem corpo de resposta
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// -----------------------------------------------------------------------------
// (Opcional) ROTA DE AÇÃO: FECHAR CHAMADO — PATCH /api/chamados/:id/fechar
// -----------------------------------------------------------------------------
// Objetivo: atalho para mudar o estado para 'f' (fechado).
router.patch("/:id/fechar", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    try {
        const { rows } = await pool.query(
            `UPDATE chamados
                SET estado = 'f',
                    data_atualizacao = now()
            WHERE id = $1
            RETURNING *`,
            [id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
export default router;
// -----------------------------------------------------------------------------
// COMO "MONTAR" ESTE ROUTER NO APP PRINCIPAL (exemplo):
// -----------------------------------------------------------------------------
// import express from "express";
// import chamadosRouter from "./routes/chamados.routes.js";
//
// const app = express();
// app.use(express.json());
// app.use("/api/chamados", chamadosRouter); // prefixo para todas as rotas acima
//
// app.listen(3000, () => console.log("Servidor rodando..."));
