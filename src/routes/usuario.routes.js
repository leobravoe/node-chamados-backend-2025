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
  // regra de negócio
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
    const u = r.rows[0];

    const access_token = signAccessToken(u);
    const refresh_token = signRefreshToken(u);
    setRefreshCookie(res, req, refresh_token);

    return res.status(201).json({
      token_type: "Bearer",
      access_token,
      expires_in: JWT_ACCESS_EXPIRES,
      user: { id: u.id, nome: u.nome, email: u.email, papel: u.papel },
    });
  } catch (err) {
    // Código 23505 (Postgres) indica violação de UNIQUE (e.g. email já cadastrado)
    if (err?.code === "23505") return res.status(409).json({ erro: "email já cadastrado" });
    return res.status(500).json({ erro: "erro interno" });
  }
});

export default router;              // Exporta o roteador para ser montado no servidor principal