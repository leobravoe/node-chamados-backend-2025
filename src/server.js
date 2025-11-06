import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";// Parser de cookies → preenche req.cookies
import { authMiddleware } from "./middlewares/auth.js";    // Middleware de autenticação (access token)
import chamadosRouter from "./routes/chamados.routes.js";
import usuariosRouter from "./routes/usuarios.routes.js";  // Rotas de auth/registro/refresh
dotenv.config();
const app = express();

app.use(express.json());
// Lê o cabeçalho Cookie e preenche req.cookies com {nome: valor}. 
// Com um segredo, valida cookies assinados e expõe em req.signedCookies 
// permitindo ao servidor acessar, por exemplo, o refresh_token HttpOnly.
app.use(cookieParser());

app.use(cors());

// armazenamento de arquivos enviados (pasta na raiz /uploads)
app.use('/uploads', express.static('./uploads'));

app.get("/", (_req, res) => {
    res.json({
        LISTAR: "GET /api/chamados",
        MOSTRAR: "GET /api/chamados/:id",
        CRIAR: "POST /api/chamados  BODY: { Usuarios_id: number, texto: 'string', estado?: 'a'|'f', url_imagem?: 'string' }",
        SUBSTITUIR: "PUT /api/chamados/:id  BODY: { Usuarios_id: number, texto: 'string', estado: 'a'|'f', url_imagem?: 'string' }",
        ATUALIZAR: "PATCH /api/chamados/:id  BODY: { Usuarios_id?: number, texto?: 'string', estado?: 'a'|'f', url_imagem?: 'string' }",
        DELETAR: "DELETE /api/chamados/:id",
    });
});

// Rotas de usuário
// - /api/usuarios/login     → emite access token (corpo) e refresh em cookie HttpOnly
// - /api/usuarios/refresh   → lê/rotaciona refresh do cookie e devolve novo access
// - /api/usuarios/register  → cria usuário + já autentica
// - /api/usuarios/logout    → apaga cookie do refresh
app.use("/api/usuarios", usuariosRouter);

// Colocar um middleware para proteger todas as rotas
app.use("/api/chamados", authMiddleware, chamadosRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log("CORS configurado: permissivo (aceita qualquer origem).");
});