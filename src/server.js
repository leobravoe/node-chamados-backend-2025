// server.js — app principal com prefixo /api
// -----------------------------------------------------------------------------
// O QUE ESTE ARQUIVO FAZ?
// 1) Carrega variáveis de ambiente (.env) para process.env
// 2) Cria um servidor HTTP com Express
// 3) Expõe uma rota raiz (GET /) que lista os endpoints disponíveis
// 4) Monta um agrupamento de rotas (Router) de produtos sob o prefixo /api/produtos
//
// TERMOS IMPORTANTES (para iniciantes):
// - Servidor HTTP: programa que recebe pedidos (requests) e envia respostas (responses).
// - Rota (endpoint): combinação de URL + método HTTP (GET, POST, PUT, PATCH, DELETE).
// - Middleware: função que roda “no meio do caminho” entre o pedido e a resposta
//   (ex.: express.json() transforma JSON do corpo em objeto JS).
// - Router: “mini-aplicativo” com rotas específicas; ajuda a organizar o código
//   separando responsabilidades (ex.: tudo de produtos fica em produtos.routes.js).
//
// SOBRE VARIÁVEIS DE AMBIENTE:
// - Em projetos reais, você NÃO coloca senhas/URLs/portas “hardcoded” no código.
// - Em vez disso, cria um arquivo .env (não versionado) e usa dotenv para carregar
//   essas chaves em process.env (ex.: process.env.PORT).
// -----------------------------------------------------------------------------
import express from "express";
import dotenv from "dotenv";
import produtosRouter from "./routes/produtos.routes.js";

dotenv.config(); 
// ↑ Lê o arquivo .env (se existir) e popula process.env com as chaves definidas.
//   Importante: chame dotenv.config() antes de acessar qualquer process.env.

const app = express();

// -----------------------------------------------------------------------------
// MIDDLEWARE: interpretar JSON do corpo das requisições
// - Sem isso, req.body seria undefined quando o cliente envia JSON.
// - Exemplo: POST /api/produtos com corpo { "nome": "Caneta", "preco": 5.5 }
//   → req.body vira { nome: "Caneta", preco: 5.5 }.
// -----------------------------------------------------------------------------
app.use(express.json());

// -----------------------------------------------------------------------------
// ROTA DE BOAS-VINDAS (GET /)
// - Retorna um “guia rápido” em JSON com os endpoints disponíveis da API.
// - Útil para abrir no navegador e ter uma visão geral do que existe.
// -----------------------------------------------------------------------------
app.get("/", (_req, res) => {
  res.json({
    LISTAR:     "GET /api/produtos",
    MOSTRAR:    "GET /api/produtos/:id",
    CRIAR:      "POST /api/produtos  BODY: { nome: 'string', preco: Number }",
    SUBSTITUIR: "PUT /api/produtos/:id  BODY: { nome: 'string', preco: Number }",
    ATUALIZAR:  "PATCH /api/produtos/:id  BODY: { nome?: 'string', preco?: Number }",
    DELETAR:    "DELETE /api/produtos/:id",
  });
});

// -----------------------------------------------------------------------------
// MONTAGEM DO ROUTER DE PRODUTOS EM /api/produtos
// - produtosRouter é um Router do Express definido em ./routes/produtos.routes.js.
// - app.use("/api/produtos", produtosRouter) diz ao Express:
//     “Para qualquer caminho que COMEÇA com /api/produtos, use as rotas
//      definidas dentro de produtosRouter.”
// - Isso adiciona o prefixo automaticamente, melhorando a organização:
//     GET    /api/produtos
//     GET    /api/produtos/:id
//     POST   /api/produtos
//     PUT    /api/produtos/:id
//     PATCH  /api/produtos/:id
//     DELETE /api/produtos/:id
// -----------------------------------------------------------------------------
app.use("/api/produtos", produtosRouter);

// -----------------------------------------------------------------------------
// INICIANDO O SERVIDOR
// - process.env.PORT permite definir a porta via ambiente (ex.: PORT=8080).
// - Caso não exista, usamos 3000 como padrão.
// - app.listen inicia o servidor e imprime no console a URL local para teste.
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
// Abra esse endereço no navegador para ver a rota GET / (a lista de endpoints).
