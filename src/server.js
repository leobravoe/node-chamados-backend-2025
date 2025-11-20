// src/server.js
// -----------------------------------------------------------------------------------------
// Servidor Express com CORS + cookies e rotas protegidas por JWT.
// - Lê variáveis do .env (dotenv).
// - Aceita JSON no corpo (express.json()).
// - Lê cookies (cookie-parser) para pegar o refresh_token HttpOnly.
// - Habilita CORS com credenciais para permitir envio de cookies/Authorization do front.
// - Serve arquivos estáticos em /uploads.
// - Expõe rotas públicas de usuários e rotas de chamados protegidas pelo authMiddleware.
// -----------------------------------------------------------------------------------------

import express from "express";           // Framework HTTP
import dotenv from "dotenv";             // Carrega variáveis de ambiente do .env
import cors from "cors";                 // Middleware CORS
import cookieParser from "cookie-parser";// Parser de cookies → preenche req.cookies
import chamadosRouter from "./routes/chamados.routes.js";  // Rotas de CRUD de chamados
import usuariosRouter from "./routes/usuarios.routes.js";  // Rotas de auth/registro/refresh
import { authMiddleware } from "./middlewares/auth.js";    // Middleware de autenticação (access token)
import { globalLimiter, authLimiter, userLimiter } from "./middlewares/rateLimiters.js";

dotenv.config();                         // Torna disponíveis as variáveis do .env em process.env
const app = express();                   // Cria a aplicação Express

// MUITO IMPORTANTE para apps atrás de proxy (Render, Heroku, etc.)
app.set("trust proxy", 1);

// Ela faz o Express ler o corpo JSON da requisição e colocar o resultado pronto em req.body. 
// Sem isso, req.body fica vazio.
app.use(express.json());

// Lê o cabeçalho Cookie e preenche req.cookies com {nome: valor}. 
// Com um segredo, valida cookies assinados e expõe em req.signedCookies 
// permitindo ao servidor acessar, por exemplo, o refresh_token HttpOnly.
app.use(cookieParser());

// origin: true - diz ao middleware de CORS para “espelhar” a origem que chegou no header Origin do navegador 
// Na prática, isso libera qualquer site que fizer a requisição e permite funcionar com credenciais.
// credentials: true - autoriza o navegador a enviar e receber cookies e o 
// header Authorization (o CORS responde com Access-Control-Allow-Credentials: true). 
// Quando isso está ativo, o CORS não pode usar *, por isso o “espelho” do origin: true é útil. 
// No front, lembre de incluir credenciais: fetch(url, { credentials: "include" }) ou 
// axios.get(url, { withCredentials: true }).
app.use(cors({ origin: true, credentials: true }));

// Rate limit global para toda a API
app.use("/api", globalLimiter);

// Rate limit específico para autenticação
app.use("/api/usuarios/login", authLimiter);
app.use("/api/usuarios/register", authLimiter);
app.use("/api/usuarios/refresh", authLimiter);

// armazenamento de arquivos enviados (pasta na raiz /uploads)
// Observação: o Express serve os arquivos como estáticos; a URL pública fica /uploads/<arquivo>.
app.use('/uploads', express.static('./uploads'));

// Rota índice apenas para documentação rápida das rotas de chamados
app.get("/", (_req, res) => {
    res.json({
        "status": "server online"
    });
});

// Rotas de usuário
// POST /api/usuarios/login     → emite access token (corpo) e refresh em cookie HttpOnly
// POST /api/usuarios/refresh   → lê/rotaciona refresh do cookie e devolve novo access
// POST /api/usuarios/register  → cria usuário + já autentica
// POST /api/usuarios/logout    → apaga cookie do refresh
app.use("/api/usuarios", usuariosRouter);

// Rotas de chamados protegidas
// - Aplica o authMiddleware antes do router: exige Authorization: Bearer <access_token>
// - O middleware popula req.user (id, papel, nome) para uso nas rotas de chamados.
// GET /api/chamados
// GET /api/chamados/1
// POST /api/chamados
// PUT /api/chamados/1
// PATCH /api/chamados/1
// DELETE /api/chamados/1
app.use("/api/chamados", authMiddleware, userLimiter, chamadosRouter);

// Porta do servidor (usa PORT do .env se existir; senão, 3000)
const PORT = process.env.PORT || 3000;

// No Render essa env vem pronta, tipo: "https://node-chamados-backend-2025.onrender.com"
const externalUrl = process.env.RENDER_EXTERNAL_URL;

// Sobe o servidor HTTP e loga informações úteis no console
const server = app.listen(PORT, () => {
    const baseUrl = externalUrl || `http://localhost:${PORT}`;
    console.log(`Servidor rodando em ${baseUrl}`);
    console.log("CORS configurado: permissivo (aceita qualquer origem).");
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
