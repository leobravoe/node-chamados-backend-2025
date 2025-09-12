// routes/post.routes.js — rotas de POST
// -----------------------------------------------------------------------------
// OBJETIVO DESTE ARQUIVO
// -----------------------------------------------------------------------------
// Reunir todas as rotas (endpoints) do recurso "Post" usando um Router do Express.
// No app principal, este Router será montado sob o prefixo /api/posts.
// Ex.: app.use("/api/posts", postRouter)
//
// SOBRE A TABELA (resumo):
//   id             SERIAL PK
//   usuario_id     INTEGER NOT NULL  (FK -> usuario.id)
//   texto          VARCHAR(280) NOT NULL
//   data_criacao   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
//
// CONCEITOS-CHAVE (direto ao ponto):
// - Validações: usuario_id inteiro > 0; texto string 1..280 chars.
// - pool.query(SQL, [valores]): use parâmetros ($1, $2, ...).
// - RETURNING *: em INSERT/UPDATE para devolver o registro afetado.
// - Erro FK (Postgres): code "23503" quando usuario_id não existe.
// - Códigos HTTP: 200 OK, 201 Created, 204 No Content, 400 Bad Request,
//                 404 Not Found, 500 Internal Server Error.
// -----------------------------------------------------------------------------
import { Router } from "express";
import { pool } from "../database/db.js";

const router = Router();

// Utilitários de validação
const isIdValido = (n) => Number.isInteger(n) && n > 0;
const validaTexto = (v) => {
  if (typeof v !== "string") return { ok: false, erro: "texto deve ser string" };
  const t = v.trim();
  if (t.length === 0) return { ok: false, erro: "texto não pode ser vazio" };
  if (t.length > 280) return { ok: false, erro: "texto deve ter até 280 caracteres" };
  return { ok: true, texto: t };
};

// -----------------------------------------------------------------------------
// LISTAR — GET /api/posts
// Retorna TODOS os posts, mais recentes primeiro (id DESC).
// -----------------------------------------------------------------------------
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM post ORDER BY id DESC"
    );
    res.json(rows); // 200 OK
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// MOSTRAR — GET /api/posts/:id
// Retorna UM post específico pelo id.
// -----------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isIdValido(id)) return res.status(400).json({ erro: "id inválido" });

  try {
    const { rows } = await pool.query("SELECT * FROM post WHERE id = $1", [id]);
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]); // 200 OK
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// CRIAR — POST /api/posts
// Corpo esperado: { usuario_id, texto }
// - usuario_id: inteiro > 0 (FK)
// - texto: string 1..280 chars
// -----------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { usuario_id, texto } = req.body ?? {};

  const uid = Number(usuario_id);
  if (!isIdValido(uid)) {
    return res.status(400).json({ erro: "usuario_id deve ser inteiro > 0" });
  }

  const vTexto = validaTexto(texto);
  if (!vTexto.ok) return res.status(400).json({ erro: vTexto.erro });

  try {
    const { rows } = await pool.query(
      `INSERT INTO post (usuario_id, texto)
       VALUES ($1, $2)
       RETURNING *`,
      [uid, vTexto.texto]
    );
    res.status(201).json(rows[0]); // 201 Created
  } catch (e) {
    if (e?.code === "23503") {
      return res
        .status(400)
        .json({ erro: "usuario_id não existe (violação de chave estrangeira)" });
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// SUBSTITUIR — PUT /api/posts/:id
// Substitui TODOS os campos mutáveis do post.
// Corpo esperado (completo): { usuario_id, texto }
// -----------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isIdValido(id)) return res.status(400).json({ erro: "id inválido" });

  const { usuario_id, texto } = req.body ?? {};

  const uid = Number(usuario_id);
  if (!isIdValido(uid)) {
    return res.status(400).json({ erro: "usuario_id deve ser inteiro > 0" });
  }

  const vTexto = validaTexto(texto);
  if (!vTexto.ok) return res.status(400).json({ erro: vTexto.erro });

  try {
    const { rows } = await pool.query(
      `UPDATE post
         SET usuario_id = $1,
             texto      = $2
       WHERE id = $3
       RETURNING *`,
      [uid, vTexto.texto, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]); // 200 OK
  } catch (e) {
    if (e?.code === "23503") {
      return res
        .status(400)
        .json({ erro: "usuario_id não existe (violação de chave estrangeira)" });
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// ATUALIZAR PARCIAL — PATCH /api/posts/:id
// Atualiza apenas os campos enviados.
// Regras:
// - Se enviar usuario_id -> inteiro > 0
// - Se enviar texto -> 1..280 chars
// - Se não enviar nada -> 400
// -----------------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isIdValido(id)) return res.status(400).json({ erro: "id inválido" });

  const { usuario_id, texto } = req.body ?? {};

  if (usuario_id === undefined && texto === undefined) {
    return res.status(400).json({ erro: "envie ao menos um campo para atualizar" });
  }

  let novoUid = null;
  if (usuario_id !== undefined) {
    const uid = Number(usuario_id);
    if (!isIdValido(uid)) {
      return res.status(400).json({ erro: "usuario_id deve ser inteiro > 0" });
    }
    novoUid = uid;
  }

  let novoTexto = null;
  if (texto !== undefined) {
    const vTexto = validaTexto(texto);
    if (!vTexto.ok) return res.status(400).json({ erro: vTexto.erro });
    novoTexto = vTexto.texto;
  }

  try {
    const { rows } = await pool.query(
      `UPDATE post
         SET usuario_id = COALESCE($1, usuario_id),
             texto      = COALESCE($2, texto)
       WHERE id = $3
       RETURNING *`,
      [novoUid, novoTexto, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]); // 200 OK
  } catch (e) {
    if (e?.code === "23503") {
      return res
        .status(400)
        .json({ erro: "usuario_id não existe (violação de chave estrangeira)" });
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// DELETAR — DELETE /api/posts/:id
// Remove um post existente. 204 em caso de sucesso.
// -----------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isIdValido(id)) return res.status(400).json({ erro: "id inválido" });

  try {
    const r = await pool.query("DELETE FROM post WHERE id = $1 RETURNING id", [id]);
    if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
    res.status(204).end(); // 204 No Content
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// (Opcional) LISTAR POR USUÁRIO — GET /api/posts/usuario/:usuarioId
// Útil quando quiser a "timeline" de um usuário específico.
// -----------------------------------------------------------------------------
router.get("/usuario/:usuarioId", async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  if (!isIdValido(usuarioId)) {
    return res.status(400).json({ erro: "usuarioId inválido" });
  }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM post WHERE usuario_id = $1 ORDER BY id DESC",
      [usuarioId]
    );
    res.json(rows); // 200 OK
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

export default router;

// -----------------------------------------------------------------------------
// COMO "MONTAR" ESTE ROUTER NO APP PRINCIPAL (exemplo):
// -----------------------------------------------------------------------------
// import express from "express";
// import postRouter from "./routes/post.routes.js";
//
// const app = express();
// app.use(express.json());
// app.use("/api/posts", postRouter);
//
// app.listen(3000, () => console.log("Servidor rodando..."));
