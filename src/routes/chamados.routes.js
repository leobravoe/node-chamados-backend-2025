// src/routes/chamados.routes.js

// Importa o "Router" do Express, que permite criar um conjunto de rotas
// (como se fosse um mini-app) para depois ser usado no app principal.
import { Router } from "express";

// Multer é um middleware para lidar com upload de arquivos (multipart/form-data).
import multer from "multer";

// Módulo nativo do Node para lidar com caminhos de arquivos/diretórios.
import path from "path";

// Módulo nativo do Node para operações de sistema de arquivos (criar pasta, etc.).
import fs from "fs";

// Versão "promisificada" de algumas funções de arquivo (escrever e apagar arquivo).
import { writeFile, unlink } from "node:fs/promises";

// Pool de conexões com o banco de dados (PostgreSQL) configurado em outro arquivo.
import { pool } from "../database/db.js";

// Cria uma instância de router do Express. Todas as rotas deste arquivo serão
// adicionadas a esse "router" e depois exportadas.
const router = Router();

// -----------------------------------------------------------------------------
// Configuração de uploads (diretório + helpers)
// -----------------------------------------------------------------------------

// Define o diretório raiz onde os arquivos enviados serão armazenados.
// path.resolve("uploads") pega o caminho absoluto da pasta "uploads" na raiz do projeto.
const uploadDir = path.resolve("uploads");

// Garante que a pasta "uploads" existe; se não existir, cria.
// { recursive: true } faz com que ele crie pastas intermediárias, se for preciso.
fs.mkdirSync(uploadDir, { recursive: true });

// Conjunto com os estados permitidos de um chamado.
// "a" = aberto, "f" = finalizado (por exemplo).
const ESTADOS_VALIDOS = new Set(["a", "f"]);

// Função auxiliar para validar e converter o parâmetro de ID da rota.
// Se for um número inteiro > 0, retorna o número; caso contrário, retorna null.
function parseIdParam(param) {
    const id = Number(param);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Verifica se o estado informado é um dos estados válidos definidos acima.
function isEstadoValido(estado) {
    return ESTADOS_VALIDOS.has(estado);
}

// Gera um nome de arquivo "único" usando timestamp + número aleatório
// e preserva a extensão original (ex: .png, .jpg).
function gerarNomeArquivo(originalname) {
    const ext = path.extname(originalname).toLowerCase();
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

// Monta URL completa para o arquivo, ex: http://localhost:3000/uploads/arquivo.png
// Usa protocolo (http/https) + host (domínio/porta) e o nome do arquivo.
function montarUrlCompleta(req, filename) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return `${baseUrl}/uploads/${filename}`;
}

// Salva o buffer do arquivo em disco e retorna a URL completa
// 1) Se não tiver arquivo, retorna null.
// 2) Gera um nome de arquivo, monta o caminho completo no disco, escreve o arquivo.
// 3) Retorna a URL pública para esse arquivo.
async function salvarUploadEmDisco(req, file) {
    if (!file) return null;

    const filename = gerarNomeArquivo(file.originalname);
    const filePath = path.join(uploadDir, filename);

    // writeFile escreve o conteúdo do buffer no caminho especificado.
    await writeFile(filePath, file.buffer);

    return montarUrlCompleta(req, filename);
}

// Remove arquivo a partir de uma URL ABSOLUTA salva no banco
// Ex: https://meudominio.com/uploads/arquivo.png
async function removerArquivoPorUrl(url_imagem) {
    // Se não tiver URL, não há o que remover.
    if (!url_imagem) return;

    try {
        // A classe URL separa as partes da URL (protocolo, host, pathname, etc.).
        // Exemplo: em https://site.com/uploads/img.png, o pathname é /uploads/img.png.
        const { pathname } = new URL(url_imagem); // ex: /uploads/arquivo.png

        // Pega só o nome do arquivo (última parte do caminho).
        const filename = path.basename(pathname);

        // Monta o caminho completo até o arquivo no disco.
        const filePath = path.join(uploadDir, filename);

        // Tenta apagar o arquivo do disco.
        await unlink(filePath);
    } catch {
        // Se a URL for inválida ou o arquivo já não existir, simplesmente ignoramos.
        // Não queremos que o sistema quebre por causa disso.
    }
}

// Helper para obter auth de forma padronizada
// Supõe que algum middleware anterior já tenha preenchido req.user.
// Se não tiver user, responde 401 (não autenticado) e retorna null.
// Se tiver, retorna um objeto com uid e se é admin.
function getAuthInfo(req, res) {
    const uid = req.user?.id;
    const isAdmin = req.user?.papel === 1;
    if (!uid) {
        res.status(401).json({ erro: "não autenticado" });
        return null;
    }
    return { uid, isAdmin };
}

// Helper para carregar um chamado por ID
// Faz SELECT no banco e retorna o primeiro resultado ou null se não existir.
async function obterChamadoPorId(id) {
    const { rows } = await pool.query(
        `SELECT * FROM "Chamados" WHERE "id" = $1`,
        [id]
    );
    return rows[0] ?? null;
}

// -----------------------------------------------------------------------------
// Multer usando memória (arquivo só vai pro disco depois de validar tudo)
// -----------------------------------------------------------------------------

// Configura o multer para armazenar o upload em MEMÓRIA (buffer) primeiro,
// ao invés de salvar diretamente em disco. Assim conseguimos validar os dados
// e só depois salvar o arquivo.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        // Limite de tamanho do arquivo: 5MB.
        fileSize: 5 * 1024 * 1024, // 5MB (ajuste conforme sua necessidade)
    },
});

// -----------------------------------------------------------------------------
// GET /api/chamados
// Lista todos os chamados
// -----------------------------------------------------------------------------
// Quando o cliente faz GET em /api/chamados, buscamos todos os registros
// na tabela "Chamados" ordenando por id decrescente (mais recentes primeiro).
router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM "Chamados" ORDER BY "id" DESC`
        );
        // Devolve o array de chamados em formato JSON.
        res.json(rows);
    } catch {
        // Se der qualquer erro no servidor ou banco, retornamos 500.
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// GET /api/chamados/:id
// Busca um chamado específico
// -----------------------------------------------------------------------------
// Aqui pegamos o :id da URL, validamos e tentamos encontrar esse chamado no banco.
router.get("/:id", async (req, res) => {
    // Converte o parâmetro de rota para número e valida.
    const id = parseIdParam(req.params.id);
    if (!id) {
        // 400 = requisição inválida (cliente mandou algo errado).
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        const chamado = await obterChamadoPorId(id);
        if (!chamado) return res.status(404).json({ erro: "não encontrado" });
        // Se encontrou, devolvemos o chamado em JSON.
        res.json(chamado);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// POST /api/chamados
// Cria chamado (texto, estado ["a"/"f"], imagem opcional).
// Salva url_imagem como URL COMPLETA no banco.
// -----------------------------------------------------------------------------
// upload.single("imagem") é o middleware do multer que processa UM arquivo
// com o campo "imagem" no formulário (input name="imagem").
router.post("/", upload.single("imagem"), async (req, res) => {
    // Primeiro, validamos autenticação (precisa estar logado).
    const auth = getAuthInfo(req, res);
    if (!auth) return;
    const { uid } = auth;

    // Desestrutura o corpo da requisição. Se req.body for undefined, usa {}.
    const { texto, estado } = req.body ?? {};

    // Se não vier estado, assumimos "a" (aberto) como padrão.
    const est = estado ?? "a"; // padrão: aberto

    // Validação do texto: precisa ser string não vazia.
    const temTextoValido = typeof texto === "string" && texto.trim() !== "";

    // Validação do estado: precisa ser "a" ou "f".
    const temEstadoValido = isEstadoValido(est);

    if (!temTextoValido || !temEstadoValido) {
        // Se algum campo obrigatório estiver inválido, retornamos 400.
        return res.status(400).json({
            erro:
                "Campos obrigatórios: texto (string não vazia) e estado ('a' ou 'f' — se ausente, assume 'a')",
        });
    }

    // Variável para guardar a URL da imagem (se houver).
    let urlImagem = null;

    try {
        // Se um arquivo foi enviado, salvamos no disco e pegamos a URL.
        if (req.file) {
            urlImagem = await salvarUploadEmDisco(req, req.file);
        }

        // Insere o novo chamado no banco. "Usuarios_id" recebe o id do usuário logado.
        const { rows } = await pool.query(
            `INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado", "url_imagem")
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [uid, texto.trim(), est, urlImagem]
        );

        // 201 = criado com sucesso. Devolvemos o registro criado.
        res.status(201).json(rows[0]);
    } catch {
        // Se der erro depois de salvar a imagem, removemos o arquivo para não deixar lixo.
        if (urlImagem) {
            await removerArquivoPorUrl(urlImagem);
        }
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// PUT /api/chamados/:id
// Atualização COMPLETA (texto, estado, imagem opcional).
// Regras:
//  - Se vier imagem nova → salva nova, faz UPDATE, depois remove a antiga.
//  - Se não vier imagem → zera url_imagem e remove a antiga (se existir).
// -----------------------------------------------------------------------------
// PUT semântica: você envia TODOS os campos obrigatórios de um recurso e substitui
// o recurso como um todo (diferente de PATCH, que atualiza só partes).
router.put("/:id", upload.single("imagem"), async (req, res) => {
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

    // Em PUT, exigimos texto e estado válidos sempre.
    if (!temTextoValido || !temEstadoValido) {
        return res.status(400).json({
            erro:
                "Para PUT, envie texto (string não vazia) e estado ('a' | 'f'); imagem é opcional.",
        });
    }

    // Guardam a URL antiga e a nova para depois gerenciar remoção de arquivo.
    let urlImagemNova = null;
    let urlImagemAntiga = null;

    try {
        // 1) Busca chamado e valida permissão:
        //    - Se não existir → 404
        //    - Se não for admin e não for o dono → também 404 (não revelamos que existe).
        const chamado = await obterChamadoPorId(id);
        if (!chamado) {
            return res.status(404).json({ erro: "não encontrado" });
        }
        if (!isAdmin && chamado.Usuarios_id !== uid) {
            return res.status(404).json({ erro: "não encontrado" });
        }

        urlImagemAntiga = chamado.url_imagem;

        // 2) Decide nova URL da imagem:
        //    - Se veio arquivo → salva nova imagem e usa a nova URL;
        //    - Se NÃO veio arquivo → mantém a imagem antiga.
        if (req.file) {
            urlImagemNova = await salvarUploadEmDisco(req, req.file);
        } else {
            urlImagemNova = urlImagemAntiga; // mantém a existente
        }

        // 3) Atualiza texto, estado e url_imagem
        const { rows } = await pool.query(
            `UPDATE "Chamados"
             SET "texto"            = $1,
                 "estado"           = $2,
                 "url_imagem"       = $3,
                 "data_atualizacao" = now()
             WHERE "id" = $4
             RETURNING *`,
            [texto.trim(), estado, urlImagemNova, id]
        );

        if (!rows[0]) {
            // Caso raro: o registro foi apagado entre o SELECT e o UPDATE.
            // Nesse caso, se salvamos uma nova imagem, precisamos removê-la.
            if (req.file && urlImagemNova) {
                await removerArquivoPorUrl(urlImagemNova);
            }
            return res.status(404).json({ erro: "não encontrado" });
        }

        // 4) Se trocou a imagem (tinha antiga e agora é outra), remove a antiga
        if (
            req.file &&               // só faz sentido se mandou nova
            urlImagemAntiga &&        // existia antiga
            urlImagemAntiga !== urlImagemNova
        ) {
            await removerArquivoPorUrl(urlImagemAntiga);
        }

        // Devolve o chamado atualizado.
        res.json(rows[0]);
    } catch {
        // Se falhou depois de criar nova imagem, remove a nova pra não deixar lixo.
        if (req.file && urlImagemNova) {
            await removerArquivoPorUrl(urlImagemNova);
        }
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// PATCH /api/chamados/:id
// Atualização PARCIAL (texto, estado e/ou imagem).
// Regras para imagem:
//  - Se enviar um arquivo novo → salva nova, faz UPDATE, depois remove a antiga.
//  - Se enviar url_imagem = null (JSON) → seta url_imagem = null e apaga a antiga.
//  - Se não enviar nada relativo à imagem → mantém imagem atual.
// -----------------------------------------------------------------------------
// PATCH semântica: você pode enviar apenas alguns campos para atualizar,
// não precisa mandar o recurso completo.
router.patch("/:id", upload.single("imagem"), async (req, res) => {
    const id = parseIdParam(req.params.id);
    if (!id) {
        return res.status(400).json({ erro: "id inválido" });
    }

    const auth = getAuthInfo(req, res);
    if (!auth) return;
    const { uid, isAdmin } = auth;

    // body pode conter qualquer combinação de texto, estado, url_imagem.
    const body = req.body ?? {};
    const { texto, estado, url_imagem } = body;

    // Flags para saber o que o cliente quer atualizar.
    const querAtualizarTexto = texto !== undefined;
    const querAtualizarEstado = estado !== undefined;
    const querAtualizarImagem =
        !!req.file || url_imagem === null; // só consideramos null explícito como "remover"

    // Se nenhuma dessas coisas for enviada, não há o que PATCH fazer.
    if (!querAtualizarTexto && !querAtualizarEstado && !querAtualizarImagem) {
        return res
            .status(400)
            .json({ erro: "envie ao menos um campo para atualizar" });
    }

    // Essas variáveis vão guardar os novos valores válidos, caso existam.
    let novoTexto = undefined;
    if (querAtualizarTexto) {
        if (typeof texto !== "string" || texto.trim() === "") {
            return res
                .status(400)
                .json({ erro: "texto deve ser string não vazia" });
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

    // Não permitimos setar url_imagem para um valor arbitrário via body;
    // ou vem arquivo (nova imagem) ou vem null (remover).
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
        // Busca o chamado atual para saber os valores existentes e verificar permissão.
        const chamado = await obterChamadoPorId(id);
        if (!chamado) {
            return res.status(404).json({ erro: "não encontrado" });
        }
        if (!isAdmin && chamado.Usuarios_id !== uid) {
            return res.status(404).json({ erro: "não encontrado" });
        }

        urlImagemAntiga = chamado.url_imagem;

        // Decide a nova URL da imagem de acordo com o que foi enviado:
        // - Se veio um arquivo → salva e usa nova URL.
        // - Se url_imagem === null → remove imagem.
        // - Senão → mantém a imagem atual.
        if (req.file) {
            urlImagemNova = await salvarUploadEmDisco(req, req.file);
            criouNovaImagem = true;
        } else if (url_imagem === null) {
            urlImagemNova = null; // remoção explícita
        } else {
            urlImagemNova = urlImagemAntiga; // mantém a atual
        }

        // Se o cliente não mandou texto novo, continuamos com o texto atual do chamado.
        const textoFinal = novoTexto !== undefined ? novoTexto : chamado.texto;

        // Se o cliente não mandou estado novo, continuamos com o estado atual.
        const estadoFinal =
            novoEstado !== undefined ? novoEstado : chamado.estado;

        // Atualiza no banco apenas com os valores finais decididos.
        const { rows } = await pool.query(
            `UPDATE "Chamados"
             SET "texto"            = $1,
                 "estado"           = $2,
                 "url_imagem"       = $3,
                 "data_atualizacao" = now()
             WHERE "id" = $4
             RETURNING *`,
            [textoFinal, estadoFinal, urlImagemNova, id]
        );

        if (!rows[0]) {
            // Caso muito improvável, mas se acontecer e criamos imagem nova,
            // limpamos essa imagem.
            if (criouNovaImagem && urlImagemNova) {
                await removerArquivoPorUrl(urlImagemNova);
            }
            return res.status(404).json({ erro: "não encontrado" });
        }

        // Se houve mudança de imagem (nova ou remoção) e existia antiga, apaga antiga.
        if (urlImagemAntiga && urlImagemAntiga !== urlImagemNova) {
            await removerArquivoPorUrl(urlImagemAntiga);
        }

        // Devolve o chamado atualizado.
        res.json(rows[0]);
    } catch {
        // Se deu erro depois de criar uma nova imagem, removemos para não deixar lixo.
        if (criouNovaImagem && urlImagemNova) {
            await removerArquivoPorUrl(urlImagemNova);
        }
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// DELETE /api/chamados/:id
// Apaga o chamado e, se tiver url_imagem, tenta apagar o arquivo de disco também.
// -----------------------------------------------------------------------------
// DELETE remove o recurso do banco. Aqui também limpamos o arquivo de imagem
// correspondente, se existir.
router.delete("/:id", async (req, res) => {
    const id = parseIdParam(req.params.id);
    if (!id) {
        return res.status(400).json({ erro: "id inválido" });
    }

    const auth = getAuthInfo(req, res);
    if (!auth) return;
    const { uid, isAdmin } = auth;

    try {
        // Antes de apagar, buscamos o chamado para verificar:
        // - se existe
        // - se o usuário tem permissão (dono ou admin)
        const chamado = await obterChamadoPorId(id);
        if (!chamado) {
            return res.status(404).json({ erro: "não encontrado" });
        }
        if (!isAdmin && chamado.Usuarios_id !== uid) {
            return res.status(404).json({ erro: "não encontrado" });
        }

        // Remove o registro da tabela.
        await pool.query(`DELETE FROM "Chamados" WHERE "id" = $1`, [id]);

        // Se havia imagem associada, tentamos remover o arquivo.
        if (chamado.url_imagem) {
            await removerArquivoPorUrl(chamado.url_imagem);
        }

        // 204 = sucesso sem conteúdo no corpo da resposta.
        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// Exporta o router para ser usado no arquivo principal (ex: app.js).
export default router;