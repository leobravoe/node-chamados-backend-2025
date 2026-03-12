import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { recaptchaMiddleware } from "../middlewares/recaptcha.js";
import { writeFile, unlink } from "node:fs/promises";
import { pool } from "../database/db-mysql.js";

const router = Router();

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const ESTADOS_VALIDOS = new Set(["a", "f"]);

function parseIdParam(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isEstadoValido(estado) {
  return ESTADOS_VALIDOS.has(estado);
}

function gerarNomeArquivo(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

function montarUrlCompleta(req, filename) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${filename}`;
}

async function salvarUploadEmDisco(req, file) {
  if (!file) return null;

  const filename = gerarNomeArquivo(file.originalname);
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, file.buffer);

  return montarUrlCompleta(req, filename);
}

async function removerArquivoPorUrl(url_imagem) {
  if (!url_imagem) return;

  try {
    const { pathname } = new URL(url_imagem);
    const filename = path.basename(pathname);
    const filePath = path.join(uploadDir, filename);
    await unlink(filePath);
  } catch {
    // ignora
  }
}

function getAuthInfo(req, res) {
  const uid = req.user?.id;
  const isAdmin = req.user?.papel === 1;
  if (!uid) {
    res.status(401).json({ erro: "não autenticado" });
    return null;
  }
  return { uid, isAdmin };
}

async function obterChamadoPorId(id) {
  const [rows] = await pool.query(
    `SELECT \`Chamados\`.*, \`Usuarios\`.\`nome\`
     FROM \`Chamados\`
     JOIN \`Usuarios\` ON \`Chamados\`.\`Usuarios_id\` = \`Usuarios\`.\`id\`
     WHERE \`Chamados\`.\`id\` = ?`,
    [id]
  );
  return rows[0] ?? null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/**
 * @openapi
 * /api/chamados:
 *   get:
 *     tags: [Chamados]
 *     summary: Lista todos os chamados
 *     description: Retorna os chamados ordenados por estado e data_atualizacao.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de chamados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chamado'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT \`Chamados\`.*, \`Usuarios\`.\`nome\`
       FROM \`Chamados\`
       JOIN \`Usuarios\` ON \`Chamados\`.\`Usuarios_id\` = \`Usuarios\`.\`id\`
       ORDER BY \`Chamados\`.\`estado\`, \`Chamados\`.\`data_atualizacao\` ASC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

/**
 * @openapi
 * /api/chamados/{id}:
 *   get:
 *     tags: [Chamados]
 *     summary: Busca um chamado por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Chamado encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "id inválido" });
  }

  try {
    const chamado = await obterChamadoPorId(id);
    if (!chamado) return res.status(404).json({ erro: "não encontrado" });
    res.json(chamado);
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

/**
 * @openapi
 * /api/chamados:
 *   post:
 *     tags: [Chamados]
 *     summary: Cria um novo chamado
 *     description: |
 *       Cria um chamado para o usuário autenticado.
 *       Aceita upload opcional de imagem.
 *       Se o campo estado não for enviado, assume "a".
 *       Esta rota passa por recaptchaMiddleware.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ChamadoCreateMultipart'
 *     responses:
 *       201:
 *         description: Chamado criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post("/", upload.single("imagem"), recaptchaMiddleware, async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid } = auth;

  const { texto, estado } = req.body ?? {};
  const est = estado ?? "a";

  const temTextoValido = typeof texto === "string" && texto.trim() !== "";
  const temEstadoValido = isEstadoValido(est);

  if (!temTextoValido || !temEstadoValido) {
    return res.status(400).json({
      erro:
        "Campos obrigatórios: texto (string não vazia) e estado ('a' ou 'f' — se ausente, assume 'a')",
    });
  }

  let urlImagem = null;

  try {
    if (req.file) {
      urlImagem = await salvarUploadEmDisco(req, req.file);
    }

    const [result] = await pool.query(
      `INSERT INTO \`Chamados\` (\`Usuarios_id\`, \`texto\`, \`estado\`, \`url_imagem\`)
       VALUES (?, ?, ?, ?)`,
      [uid, texto.trim(), est, urlImagem]
    );

    const novoId = result.insertId;
    const chamadoCriado = await obterChamadoPorId(novoId);

    res.status(201).json(chamadoCriado);
  } catch {
    if (urlImagem) {
      await removerArquivoPorUrl(urlImagem);
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

/**
 * @openapi
 * /api/chamados/{id}:
 *   put:
 *     tags: [Chamados]
 *     summary: Atualiza completamente um chamado
 *     description: |
 *       Atualiza texto, estado e opcionalmente a imagem.
 *       Usuário comum só pode atualizar o próprio chamado.
 *       Administrador pode atualizar qualquer chamado.
 *       Esta rota passa por recaptchaMiddleware.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ChamadoPutMultipart'
 *     responses:
 *       200:
 *         description: Chamado atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Não encontrado ou sem permissão de acesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put("/:id", upload.single("imagem"), recaptchaMiddleware, async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "id inválido" });
  }

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { texto, estado } = req.body ?? {};

  const temTextoValido = typeof texto === "string" && texto.trim() !== "";
  const temEstadoValido = isEstadoValido(estado);

  if (!temTextoValido || !temEstadoValido) {
    return res.status(400).json({
      erro: "Para PUT, envie texto (string não vazia) e estado ('a' | 'f'); imagem é opcional.",
    });
  }

  let urlImagemNova = null;
  let urlImagemAntiga = null;

  try {
    const chamado = await obterChamadoPorId(id);
    if (!chamado) {
      return res.status(404).json({ erro: "não encontrado" });
    }
    if (!isAdmin && chamado.Usuarios_id !== uid) {
      return res.status(404).json({ erro: "não encontrado" });
    }

    urlImagemAntiga = chamado.url_imagem;

    if (req.file) {
      urlImagemNova = await salvarUploadEmDisco(req, req.file);
    } else {
      urlImagemNova = urlImagemAntiga;
    }

    const [result] = await pool.query(
      `UPDATE \`Chamados\`
       SET \`texto\` = ?,
           \`estado\` = ?,
           \`url_imagem\` = ?,
           \`data_atualizacao\` = CURRENT_TIMESTAMP
       WHERE \`id\` = ?`,
      [texto.trim(), estado, urlImagemNova, id]
    );

    if (!result.affectedRows) {
      if (req.file && urlImagemNova) {
        await removerArquivoPorUrl(urlImagemNova);
      }
      return res.status(404).json({ erro: "não encontrado" });
    }

    if (req.file && urlImagemAntiga && urlImagemAntiga !== urlImagemNova) {
      await removerArquivoPorUrl(urlImagemAntiga);
    }

    const chamadoAtualizado = await obterChamadoPorId(id);
    res.json(chamadoAtualizado);
  } catch {
    if (req.file && urlImagemNova) {
      await removerArquivoPorUrl(urlImagemNova);
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

/**
 * @openapi
 * /api/chamados/{id}:
 *   patch:
 *     tags: [Chamados]
 *     summary: Atualiza parcialmente um chamado
 *     description: |
 *       Atualização parcial de chamado.
 *       Envie ao menos um campo.
 *       Para trocar a imagem, envie um arquivo em "imagem".
 *       Para remover a imagem, envie "url_imagem = null".
 *       Usuário comum só pode atualizar o próprio chamado.
 *       Administrador pode atualizar qualquer chamado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ChamadoPatchMultipart'
 *     responses:
 *       200:
 *         description: Chamado atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Não encontrado ou sem permissão de acesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.patch("/:id", upload.single("imagem"), async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "id inválido" });
  }

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const body = req.body ?? {};
  const { texto, estado, url_imagem } = body;

  const querAtualizarTexto = texto !== undefined;
  const querAtualizarEstado = estado !== undefined;
  const querAtualizarImagem = !!req.file || url_imagem === null;

  if (!querAtualizarTexto && !querAtualizarEstado && !querAtualizarImagem) {
    return res.status(400).json({ erro: "envie ao menos um campo para atualizar" });
  }

  let novoTexto = undefined;
  if (querAtualizarTexto) {
    if (typeof texto !== "string" || texto.trim() === "") {
      return res.status(400).json({ erro: "texto deve ser string não vazia" });
    }
    novoTexto = texto.trim();
  }

  let novoEstado = undefined;
  if (querAtualizarEstado) {
    if (!isEstadoValido(estado)) {
      return res.status(400).json({ erro: "estado deve ser 'a' ou 'f'" });
    }
    novoEstado = estado;
  }

  if (url_imagem !== undefined && url_imagem !== null) {
    return res.status(400).json({
      erro:
        "Para alterar imagem via PATCH, envie um arquivo em 'imagem' ou url_imagem = null para remover.",
    });
  }

  let urlImagemAntiga = null;
  let urlImagemNova = null;
  let criouNovaImagem = false;

  try {
    const chamado = await obterChamadoPorId(id);
    if (!chamado) {
      return res.status(404).json({ erro: "não encontrado" });
    }
    if (!isAdmin && chamado.Usuarios_id !== uid) {
      return res.status(404).json({ erro: "não encontrado" });
    }

    urlImagemAntiga = chamado.url_imagem;

    if (req.file) {
      urlImagemNova = await salvarUploadEmDisco(req, req.file);
      criouNovaImagem = true;
    } else if (url_imagem === null) {
      urlImagemNova = null;
    } else {
      urlImagemNova = urlImagemAntiga;
    }

    const textoFinal = novoTexto !== undefined ? novoTexto : chamado.texto;
    const estadoFinal = novoEstado !== undefined ? novoEstado : chamado.estado;

    const [result] = await pool.query(
      `UPDATE \`Chamados\`
       SET \`texto\` = ?,
           \`estado\` = ?,
           \`url_imagem\` = ?,
           \`data_atualizacao\` = CURRENT_TIMESTAMP
       WHERE \`id\` = ?`,
      [textoFinal, estadoFinal, urlImagemNova, id]
    );

    if (!result.affectedRows) {
      if (criouNovaImagem && urlImagemNova) {
        await removerArquivoPorUrl(urlImagemNova);
      }
      return res.status(404).json({ erro: "não encontrado" });
    }

    if (urlImagemAntiga && urlImagemAntiga !== urlImagemNova) {
      await removerArquivoPorUrl(urlImagemAntiga);
    }

    const chamadoAtualizado = await obterChamadoPorId(id);
    res.json(chamadoAtualizado);
  } catch {
    if (criouNovaImagem && urlImagemNova) {
      await removerArquivoPorUrl(urlImagemNova);
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

/**
 * @openapi
 * /api/chamados/{id}:
 *   delete:
 *     tags: [Chamados]
 *     summary: Remove um chamado
 *     description: |
 *       Remove um chamado e a imagem associada, se existir.
 *       No código atual, apenas administradores podem remover chamados.
 *       Quando o usuário não é administrador, a implementação retorna 404 e não 403.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       204:
 *         description: Chamado removido com sucesso
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Não encontrado ou usuário sem perfil suficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "id inválido" });
  }

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { isAdmin } = auth;

  try {
    const chamado = await obterChamadoPorId(id);
    if (!chamado) {
      return res.status(404).json({ erro: "não encontrado" });
    }
    if (!isAdmin) {
      return res
        .status(404)
        .json({ erro: "Somente administradores podem remover chamados" });
    }

    await pool.query(`DELETE FROM \`Chamados\` WHERE \`id\` = ?`, [id]);

    if (chamado.url_imagem) {
      await removerArquivoPorUrl(chamado.url_imagem);
    }

    res.status(204).end();
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

export default router;
