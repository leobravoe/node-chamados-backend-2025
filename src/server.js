// server.js
// -----------------------------------------------------------------------------
// OBJETIVO DESTE ARQUIVO
// -----------------------------------------------------------------------------
// Este arquivo cria uma pequena API REST de "produtos" usando:
// - Express (framework HTTP para Node.js)
// - PostgreSQL (acesso via pool de conexões importado de ./db.js)
//
// COMO LER ESTE CÓDIGO (para iniciantes):
// - Tudo que começa com // é comentário e NÃO é executado.
// - "async/await" indica que estamos esperando operações assíncronas (ex.: acessar o banco).
// - Em rotas, "req" é o pedido do cliente; "res" é a resposta do servidor.
// - Ao final, chamamos app.listen(PORT) para iniciar o servidor HTTP.
//
// CÓDIGOS DE STATUS HTTP QUE USAMOS:
// - 200 OK      → requisição deu certo e retornamos dados.
// - 201 Created → criação de recurso deu certo e retornamos o que foi criado.
// - 204 No Content → operação deu certo, mas não há corpo para enviar (por ex., DELETE).
// - 400 Bad Request → o cliente enviou dados inválidos (ex.: id negativo).
// - 404 Not Found   → não achamos o recurso pedido (ex.: produto inexistente).
// - 500 Internal Server Error → um erro inesperado aconteceu no servidor.
//
// SOBRE SEGURANÇA E SQL:
// - Usamos "queries parametrizadas" com $1, $2 etc. para evitar SQL Injection.
//   Ex.: pool.query("SELECT ... WHERE id = $1", [id])
// - Nunca concatenar valores vindos do usuário em strings de SQL.
//
// SOBRE JSON:
// - app.use(express.json()) permite que o Express entenda JSON que chega no corpo
//   da requisição (req.body). O cliente deve enviar o cabeçalho "Content-Type: application/json".
//
// -----------------------------------------------------------------------------
// IMPORTAÇÕES E CONFIGURAÇÃO INICIAL
// -----------------------------------------------------------------------------
import express from "express";
import { pool } from "./db.js"; // "pool" gerencia conexões com o PostgreSQL
const app = express();

app.use(express.json()); 
// ^ Middleware que transforma JSON recebido no body em objeto JS (req.body).
//   Sem isso, req.body seria undefined para pedidos com JSON.

// -----------------------------------------------------------------------------
// ROTA DE BOAS-VINDAS / DOCUMENTAÇÃO RÁPIDA (GET /)
// -----------------------------------------------------------------------------
// Esta rota apenas lista, em JSON, as rotas disponíveis.
// Útil como "home" da API para quem está testando no navegador.
app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /produtos",
            "MOSTRAR": "GET /produtos/:id",
            "CRIAR": "POST /produtos BODY: { nome: 'string', preco: Number }",
            "SUBSTITUIR": "PUT /produtos/:id BODY: { nome: 'string', preco: Number }",
            "ATUALIZAR": "PATCH /produtos/:id BODY: { nome: 'string' || preco: Number }",
            "DELETAR": "DELETE /produtos/:id",
        };
        res.json(rotas); // Envia um objeto JS como JSON (status 200 por padrão)
    } catch {
        // Em produção normalmente também registramos (logamos) o erro para análise.
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// LISTAR TODOS (GET /produtos)
// -----------------------------------------------------------------------------
// Objetivo: trazer todos os produtos em ordem decrescente de id.
// Dica: pool.query retorna um objeto, e a propriedade "rows" contém as linhas.
app.get("/produtos", async (_req, res) => {
    try {
        // Desestruturação: extraímos apenas "rows" do objeto retornado.
        const { rows } = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
        res.json(rows); // retorna um array de objetos (cada objeto é um produto)
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// MOSTRAR UM (GET /produtos/:id)
// -----------------------------------------------------------------------------
// Objetivo: buscar UM produto específico pelo id.
// Observação: parâmetros de rota (":id") chegam como string e precisamos converter.
app.get("/produtos/:id", async (req, res) => {
    // req.params.id é SEMPRE string; usamos Number(...) para converter.
    const id = Number(req.params.id);

    // Validação do "id":
    // - Number.isInteger(id): checa se é número inteiro (NaN falha aqui).
    // - id <= 0: não aceitamos ids zero ou negativos.
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        // Consulta parametrizada: $1 será substituído pelo valor de "id".
        const result = await pool.query("SELECT * FROM produtos WHERE id = $1", [id]);

        // "rows" é um array de linhas. Se não houver primeira linha, não achou.
        const { rows } = result;
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        // Achou: devolve o primeiro (e único) produto.
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// CRIAR (POST /produtos)
// -----------------------------------------------------------------------------
// Objetivo: inserir um novo produto. Espera-se receber JSON com { nome, preco }.
// Observações:
// - req.body pode ser "undefined" se o cliente não enviar JSON; por isso usamos "?? {}"
//   para ter um objeto vazio como padrão (evita erro ao desestruturar).
app.post("/produtos", async (req, res) => {
    // Extraímos "nome" e "preco" do corpo. Se req.body for undefined, vira {}.
    const { nome, preco } = req.body ?? {};

    // Convertendo "preco" em número. Se falhar, vira NaN.
    const p = Number(preco);

    // Validações:
    // - !nome → nome ausente, vazio, null, etc. (falsy)
    // - preco == null → captura especificamente null (e também undefined)
    //   Observação: usamos == de propósito para cobrir null/undefined juntos.
    // - Number.isNaN(p) → conversão falhou (ex.: "abc")
    // - p < 0 → preço negativo não é permitido
    if (!nome || preco == null || Number.isNaN(p) || p < 0) {
        return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
    }

    try {
        // INSERT com retorno: RETURNING * devolve a linha criada.
        const { rows } = await pool.query(
            "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
            [nome, p]
        );

        // rows[0] contém o objeto recém-inserido (com id gerado, etc.)
        res.status(201).json(rows[0]); // 201 Created → recurso criado com sucesso
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// SUBSTITUIR (PUT /produtos/:id)
// -----------------------------------------------------------------------------
// Objetivo: substituir TODOS os campos do produto (put = envia o recurso completo).
// Requer: { nome, preco } válidos.
app.put("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco } = req.body ?? {};
    const p = Number(preco);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }
    if (!nome || preco == null || Number.isNaN(p) || p < 0) {
        return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
    }

    try {
        // Atualiza ambos os campos sempre (sem manter valores antigos).
        const { rows } = await pool.query(
            "UPDATE produtos SET nome = $1, preco = $2 WHERE id = $3 RETURNING *",
            [nome, p, id]
        );

        // Se não atualizou nenhuma linha, o id não existia.
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        res.json(rows[0]); // retorna o produto atualizado
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// ATUALIZAR PARCIALMENTE (PATCH /produtos/:id)
// -----------------------------------------------------------------------------
// Objetivo: atualizar APENAS os campos enviados.
// Regras:
// - Se "nome" não for enviado, mantemos o nome atual.
// - Se "preco" não for enviado, mantemos o preço atual.
// Como fazemos isso no SQL?
// - COALESCE(a, b) devolve "a" quando "a" NÃO é NULL; caso seja NULL, devolve "b".
// - Então passamos "null" para campos não enviados, e o COALESCE usa o valor atual do banco.
app.patch("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco } = req.body ?? {};

    // Validação do id
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    // Se nenhum campo foi enviado, não há o que atualizar.
    if (nome === undefined && preco === undefined) {
        return res.status(400).json({ erro: "envie nome e/ou preco" });
    }

    // Validamos "preco" somente se ele foi enviado.
    // Se não foi enviado, manteremos "p = null" para avisar o COALESCE a não mexer no preço.
    let p = null;
    if (preco !== undefined) {
        p = Number(preco);
        if (Number.isNaN(p) || p < 0) {
            return res.status(400).json({ erro: "preco deve ser número >= 0" });
        }
    }

    try {
        // Para "nome": se não veio (undefined), usamos nome ?? null → null
        // No SQL: COALESCE($1, nome) manterá o valor antigo quando $1 for NULL.
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

// -----------------------------------------------------------------------------
// DELETAR (DELETE /produtos/:id)
// -----------------------------------------------------------------------------
// Objetivo: remover um produto existente.
// Retornamos 204 No Content quando dá certo (sem corpo na resposta).
app.delete("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        // RETURNING id nos permite saber se algo foi realmente deletado.
        const r = await pool.query("DELETE FROM produtos WHERE id = $1 RETURNING id", [id]);

        // r.rowCount é o número de linhas afetadas. Se 0, o id não existia.
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });

        res.status(204).end(); // 204 = sucesso sem corpo de resposta
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// SUBIR O SERVIDOR
// -----------------------------------------------------------------------------
// process.env.PORT permite customizar a porta via variável de ambiente (ex.: Heroku).
// Se não houver, usamos 3000 como padrão.
const PORT = process.env.PORT || 3000;

// app.listen inicia o servidor HTTP e fica “escutando” pedidos.
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
// Abra este link no navegador para ver a rota "/".
