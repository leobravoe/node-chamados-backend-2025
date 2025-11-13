// src/routes/usuarios.routes.js
// ------------------------------------------------------------------------------------------
// Rotas de autenticação e registro de usuários usando JWT.
// - Access token (curto) vai no corpo da resposta e é usado pelo front no header Authorization.
// - Refresh token (longo) é guardado em cookie HttpOnly para rotação silenciosa de sessão.
// - Nenhum estado de sessão no servidor: validação por assinatura (stateless).
// Requer no .env: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES.
// ------------------------------------------------------------------------------------------

import { Router } from "express";         // Router do Express para definir as rotas deste módulo
import jwt from "jsonwebtoken";           // Biblioteca para assinar/verificar JSON Web Tokens (JWT)
import bcrypt from "bcryptjs";            // Biblioteca para hashing e verificação de senha
import dotenv from "dotenv";              // Carrega variáveis do .env em process.env
import { pool } from "../database/db.js"; // Pool do Postgres para consultas ao banco

dotenv.config();                          // Inicializa dotenv (deixa segredos acessíveis via process.env)
const router = Router();                  // Cria um roteador isolado para montar em /api/usuarios (por exemplo)

const {
    JWT_ACCESS_SECRET,                      // Segredo para verificar/assinar o access token
    JWT_REFRESH_SECRET,                     // Segredo para verificar/assinar o refresh token
    JWT_ACCESS_EXPIRES = "15m",             // Tempo de vida do access token (ex.: "15m", "1h")
    JWT_REFRESH_EXPIRES = "7d",             // Tempo de vida do refresh token (ex.: "7d")
} = process.env;

const REFRESH_COOKIE = "refresh_token";           // Nome fixo do cookie HttpOnly que guarda o refresh
// 7 dias em ms (simples e suficiente; não depende de novas envs)
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;  // Max-Age do cookie para alinhamento aproximado

function signAccessToken(u) {
    // Assina um access token com dados mínimos para autorização no back (id/papel/nome)
    return jwt.sign({ sub: u.id, papel: u.papel, nome: u.nome }, JWT_ACCESS_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRES,
    });
}
function signRefreshToken(u) {
    // Assina um refresh token identificando o usuário (sub) e marcando tipo "refresh"
    return jwt.sign({ sub: u.id, tipo: "refresh" }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES,
    });
}

function cookieOpts(req) {
    // Opções do cookie do refresh: HttpOnly (não acessível via JS do navegador),
    // SameSite=Lax (mitiga CSRF na maioria dos fluxos same-site), secure=false para desenvolvimento,
    // path limitado ao prefixo onde o router for montado (ex.: "/api/usuarios"),
    // e Max-Age para expiração no cliente.
    return {
        httpOnly: true,
        sameSite: "Lax",
        secure: false,            // simples: HTTP em dev; quando for subir HTTPS, troque para true
        // Path define o prefixo de URL no qual o navegador anexa o cookie. 
        // Em Express, req.baseUrl é o caminho onde esse router foi montado; 
        // usar path: req.baseUrl faz o cookie só ir para as rotas desse módulo. 
        // Exemplo: se o router está em /api/usuarios, o cookie é enviado para 
        // /api/usuarios/login e /api/usuarios/refresh, mas não para /api/chamados/.... 
        // O || "/" é um fallback (caso não haja prefixo), tornando o cookie válido no site todo.
        path: req.baseUrl || "/",
        maxAge: REFRESH_MAX_AGE,
    };
}
function setRefreshCookie(res, req, token) {
    // Grava o refresh token em cookie HttpOnly com as opções acima
    res.cookie(REFRESH_COOKIE, token, cookieOpts(req));
}
function clearRefreshCookie(res, req) {
    // Remove o cookie de refresh (logout ou refresh inválido)
    res.clearCookie(REFRESH_COOKIE, cookieOpts(req));
}

router.post("/login", async (req, res) => {
    // Autentica por email/senha:
    // 1) busca usuário pelo email;
    // 2) compara senha com hash;
    // 3) emite access + refresh; o refresh vai no cookie HttpOnly.
    const { email, senha } = req.body ?? {};
    if (!email || !senha) return res.status(400).json({ erro: "email e senha são obrigatórios" });

    try {
        const r = await pool.query(
            `SELECT "id","nome","email","senha_hash","papel" FROM "Usuarios" WHERE "email" = $1`,
            [email]
        );
        if (!r.rowCount) return res.status(401).json({ erro: "credenciais inválidas" });

        const user = r.rows[0];
        const ok = await bcrypt.compare(senha, user.senha_hash); // compara senha em texto com hash armazenado
        if (!ok) return res.status(401).json({ erro: "credenciais inválidas" });

        const access_token = signAccessToken(user);    // token curto para Authorization: Bearer
        const refresh_token = signRefreshToken(user);  // token longo para rotacionar sessão
        setRefreshCookie(res, req, refresh_token);  // grava refresh em cookie HttpOnly

        return res.json({
            token_type: "Bearer",
            access_token,
            expires_in: JWT_ACCESS_EXPIRES,
            user: { id: user.id, nome: user.nome, email: user.email, papel: user.papel },
        });
    } catch {
        return res.status(500).json({ erro: "erro interno" });
    }
});

router.post("/refresh", async (req, res) => {
    // Emite novo par de tokens usando o refresh do cookie:
    // 1) lê cookie HttpOnly;
    // 2) verifica assinatura/tipo;
    // 3) checa se o usuário ainda existe;
    // 4) devolve novo access e rotaciona o refresh no cookie.
    const refresh = req.cookies?.[REFRESH_COOKIE];
    if (!refresh) return res.status(401).json({ erro: "refresh ausente" });

    try {
        const payload = jwt.verify(refresh, JWT_REFRESH_SECRET);
        if (payload.tipo !== "refresh") return res.status(400).json({ erro: "refresh inválido" });

        const r = await pool.query(
            `SELECT "id","nome","email","papel" FROM "Usuarios" WHERE "id" = $1`,
            [payload.sub]
        );
        if (!r.rowCount) return res.status(401).json({ erro: "usuário não existe mais" });

        const user = r.rows[0];
        const new_access = signAccessToken(user);      // novo access token curto

        return res.json({
            token_type: "Bearer",
            access_token: new_access,
            expires_in: JWT_ACCESS_EXPIRES,
        });
    } catch {
        // Se o refresh estiver inválido/expirado, apaga cookie para não “travar” o cliente
        clearRefreshCookie(res, req);
        return res.status(401).json({ erro: "refresh inválido ou expirado" });
    }
});

router.post("/register", async (req, res) => {
    // Cadastro simples:
    // 1) valida campos mínimos;
    // 2) gera hash da senha;
    // 3) insere usuário como papel padrão (0);
    // 4) emite access + refresh e grava o refresh em cookie HttpOnly.
    const { nome, email, senha } = req.body ?? {};
    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "nome, email e senha são obrigatórios" });
    }
    if (String(senha).length < 6) {
        return res.status(400).json({ erro: "senha deve ter pelo menos 6 caracteres" });
    }

    try {
        const senha_hash = await bcrypt.hash(senha, 12); // custo 12: equilibrado entre segurança e performance
        const papel = 0;

        const r = await pool.query(
            `INSERT INTO "Usuarios" ("nome","email","senha_hash","papel")
             VALUES ($1,$2,$3,$4)
             RETURNING "id","nome","email","papel"`,
            [String(nome).trim(), String(email).trim().toLowerCase(), senha_hash, papel]
        );
        const user = r.rows[0];

        const access_token = signAccessToken(user);
        const refresh_token = signRefreshToken(user);
        setRefreshCookie(res, req, refresh_token);

        return res.status(201).json({
            token_type: "Bearer",
            access_token,
            expires_in: JWT_ACCESS_EXPIRES,
            user: { id: user.id, nome: user.nome, email: user.email, papel: user.papel },
        });
    } catch (err) {
        // Código 23505 (Postgres) indica violação de UNIQUE (e.g. email já cadastrado)
        if (err?.code === "23505") return res.status(409).json({ erro: "email já cadastrado" });
        return res.status(500).json({ erro: "erro interno" });
    }
});

router.post("/logout", async (req, res) => {
    // “Logout” stateless: apenas remove o cookie de refresh no cliente
    clearRefreshCookie(res, req);
    return res.status(204).end();
});

export default router;              // Exporta o roteador para ser montado no servidor principal
