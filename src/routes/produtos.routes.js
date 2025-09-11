// routes/produtos.routes.js — rotas de produtos
// -----------------------------------------------------------------------------
// OBJETIVO DESTE ARQUIVO
// -----------------------------------------------------------------------------
// Reunir todas as rotas (endpoints) relacionadas ao recurso "produtos" usando
// um Router do Express. Esse Router é "montado" no app principal sob o prefixo
// /api/produtos, então cada caminho abaixo fica acessível com esse prefixo.
//
// CONCEITOS-CHAVE PARA INICIANTES
// - Router (Express): um "mini-aplicativo" com rotas próprias. Ajuda a organizar
//   o projeto por área de responsabilidade (produtos, usuários, pedidos, etc.).
// - req (request): o pedido do cliente (navegador, Postman, outro servidor). 
//   Nele ficam parâmetros de rota (req.params), query string (req.query) e corpo
//   da requisição (req.body) — este último existe quando usamos express.json().
// - res (response): a resposta que o servidor envia de volta.
// - pool.query(SQL, [valores]): executa SQL no PostgreSQL. O retorno possui:
//     * rows: array com as linhas retornadas pelo SELECT/INSERT/UPDATE/DELETE
//     * rowCount: número de linhas afetadas (útil p/ saber se algo foi alterado).
// - SQL parametrizado: usamos $1, $2, ... + array de valores. Isso evita
//   SQL Injection, que é quando alguém tenta "quebrar" o SQL com entradas maliciosas.
//
// STATUS HTTP (os principais usados aqui)
// - 200 OK: requisição deu certo, respondemos com dados.
// - 201 Created: criação bem-sucedida (retornamos o recurso criado).
// - 204 No Content: operação deu certo, mas sem corpo de resposta (ex.: DELETE).
// - 400 Bad Request: dados inválidos enviados pelo cliente.
// - 404 Not Found: recurso não encontrado (ex.: id inexistente).
// - 500 Internal Server Error: erro inesperado no servidor.
//
// -----------------------------------------------------------------------------
import { Router } from "express";
import { pool } from "../db.js";

const router = Router(); 
// Criamos um Router. No app principal, algo como:
//   app.use("/api/produtos", router)
// fará com que estes caminhos fiquem disponíveis em /api/produtos(...).

// -----------------------------------------------------------------------------
// LISTAR — GET /api/produtos
// -----------------------------------------------------------------------------
// Objetivo: retornar TODOS os produtos.
// Detalhe: ORDER BY id DESC para trazer os mais recentes primeiro.
router.get("/", async (_req, res) => {
  try {
    // pool.query retorna um objeto; desestruturamos "rows" (array de resultados).
    const { rows } = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
    res.json(rows); // Envia um array JSON com todos os produtos.
  } catch {
    // Em produção, normalmente também registraríamos o erro (log) para análise.
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// MOSTRAR — GET /api/produtos/:id
// -----------------------------------------------------------------------------
// Objetivo: retornar UM produto específico pelo id.
// Observação: req.params.id é string → convertemos p/ número e validamos.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id); // tenta converter "id" para número (pode virar NaN)

  // Validação de id:
  // - Precisa ser inteiro (Number.isInteger rejeita NaN e decimais).
  // - Precisa ser > 0 (não aceitamos zero nem negativos).
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });

  try {
    // Consulta parametrizada (evita SQL Injection):
    // $1 será substituído pelo valor de "id".
    const { rows } = await pool.query("SELECT * FROM produtos WHERE id = $1", [id]);

    // Se não existir primeira linha, não achamos o produto.
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

    res.json(rows[0]); // produto encontrado
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// CRIAR — POST /api/produtos
// -----------------------------------------------------------------------------
// Objetivo: inserir um novo produto. Espera receber JSON: { nome, preco }.
//
// Dica: se o cliente não enviar JSON, req.body pode ser undefined. O "?? {}"
// abaixo garante um objeto vazio como fallback para evitar erro ao desestruturar.
router.post("/", async (req, res) => {
  const { nome, preco } = req.body ?? {}; // extrai chaves do corpo (ou {})

  // Converter "preco" para número. Se falhar, vira NaN.
  const p = Number(preco);

  // Regras de validação:
  // - nome precisa existir (não vazio/null/undefined)
  // - preco não pode ser null/undefined (por isso checamos "preco == null")
  //   Obs.: Number(null) === 0, então checamos null/undefined ANTES de converter.
  // - p precisa ser um número válido (não NaN)
  // - p não pode ser negativo
  if (!nome || preco == null || Number.isNaN(p) || p < 0) {
    return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
  }

  try {
    // INSERT com RETURNING * devolve a linha inserida (inclui id gerado, etc.).
    const { rows } = await pool.query(
      "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
      [nome, p]
    );
    res.status(201).json(rows[0]); // 201 Created
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// SUBSTITUIR — PUT /api/produtos/:id
// -----------------------------------------------------------------------------
// Objetivo: substituir TODOS os campos do produto (representação completa).
// Requer: { nome, preco } válidos. Se faltar algo, retorna 400.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, preco } = req.body ?? {};
  const p = Number(preco);

  // Validação do id
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });

  // Validação dos campos (mesmas regras do POST)
  if (!nome || preco == null || Number.isNaN(p) || p < 0) {
    return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
  }

  try {
    // Atualiza SEM preservar o valor anterior: ambos os campos são substituídos.
    const { rows } = await pool.query(
      "UPDATE produtos SET nome = $1, preco = $2 WHERE id = $3 RETURNING *",
      [nome, p, id]
    );

    // Se rows[0] não existe, id não foi encontrado na tabela.
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

    res.json(rows[0]); // produto atualizado
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// ATUALIZAR — PATCH /api/produtos/:id
// -----------------------------------------------------------------------------
// Objetivo: atualizar APENAS os campos enviados (atualização parcial).
// Regras:
// - Se "nome" NÃO for enviado, mantemos o nome atual.
// - Se "preco" NÃO for enviado, mantemos o preço atual.
//
// Como isso funciona no SQL?
// - COALESCE(a, b) devolve "a" quando "a" NÃO é NULL; se "a" for NULL, devolve "b".
// - Estratégia: quando o cliente não envia um campo, mandamos NULL para o SQL.
//   Aí COALESCE($1, nome) mantém o "nome" que já está no banco.
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, preco } = req.body ?? {};

  // Validação do id
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });

  // Se nenhum campo foi enviado, não há o que atualizar.
  if (nome === undefined && preco === undefined) {
    return res.status(400).json({ erro: "envie nome e/ou preco" });
  }

  // "p" começa como null para o caso de NÃO querermos mexer no preco.
  // Se "preco" vier definido, validamos:
  // - precisa conseguir virar número (não NaN)
  // - não pode ser negativo
  let p = null;
  if (preco !== undefined) {
    p = Number(preco);
    if (Number.isNaN(p) || p < 0) {
      return res.status(400).json({ erro: "preco deve ser número >= 0" });
    }
  }

  try {
    // Para "nome": usamos nome ?? null (undefined → null) para acionar o COALESCE.
    const { rows } = await pool.query(
      "UPDATE produtos SET nome = COALESCE($1, nome), preco = COALESCE($2, preco) WHERE id = $3 RETURNING *",
      [nome ?? null, p, id]
    );

    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

    res.json(rows[0]); // produto parcialmente atualizado
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

// -----------------------------------------------------------------------------
// DELETAR — DELETE /api/produtos/:id
// -----------------------------------------------------------------------------
// Objetivo: remover um produto existente.
// Retornamos 204 No Content quando o delete é bem-sucedido (sem corpo na resposta).
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  // Validação do id
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });

  try {
    // RETURNING id nos permite saber se algo foi realmente apagado.
    const r = await pool.query("DELETE FROM produtos WHERE id = $1 RETURNING id", [id]);

    // r.rowCount === 0 → nenhuma linha deletada → id não existia.
    if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });

    res.status(204).end(); // Sucesso sem corpo de resposta.
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

export default router;
// -----------------------------------------------------------------------------
// FIM DO ARQUIVO
// -----------------------------------------------------------------------------
// Dica: se quiser testar rapidamente, suba o servidor e use uma ferramenta como
// curl, Postman ou Insomnia para enviar requisições. Verifique sempre:
// - Cabeçalho "Content-Type: application/json" nos POST/PUT/PATCH.
// - Corpo JSON válido (aspas duplas, sem vírgulas sobrando, etc.).
