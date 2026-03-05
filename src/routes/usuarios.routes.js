// src/routes/usuarios.routes.js
// ------------------------------------------------------------------------------------------
// Ajustes Postgres -> MariaDB (mysql2):
// - pool.query agora retorna [rows] (não { rows, rowCount })
// - placeholders: $1, $2... -> ?
// - INSERT ... RETURNING -> INSERT e depois SELECT pelo insertId
// - código de erro UNIQUE do Postgres (23505) -> MariaDB: ER_DUP_ENTRY (errno 1062 / code 'ER_DUP_ENTRY')
// ------------------------------------------------------------------------------------------

import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../database/db-mysql.js"; // agora MariaDB/mysql2 pool
import { recaptchaMiddleware } from "../middlewares/recaptcha.js";

dotenv.config();
const router = Router();

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES = "15m",
  JWT_REFRESH_EXPIRES = "7d",
} = process.env;

const isProduction = process.env.NODE_ENV === "production";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const signAccessToken = (u) =>
  jwt.sign({ sub: u.id, papel: u.papel, nome: u.nome }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES,
  });

const signRefreshToken = (u) =>
  jwt.sign({ sub: u.id, tipo: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES,
  });

const cookieOpts = (req) => ({
  httpOnly: true,
  sameSite: isProduction ? "None" : "Lax",
  secure: isProduction,
  path: req.baseUrl || "/",
  maxAge: REFRESH_MAX_AGE,
});

const setRefreshCookie = (res, req, token) => {
  res.cookie(REFRESH_COOKIE, token, cookieOpts(req));
};

const clearRefreshCookie = (res, req) => {
  res.clearCookie(REFRESH_COOKIE, cookieOpts(req));
};

router.post("/register", recaptchaMiddleware, async (req, res) => {
  const { nome, email, senha } = req.body ?? {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "nome, email e senha são obrigatórios" });
  }
  if (String(senha).length < 6) {
    return res.status(400).json({ erro: "senha deve ter pelo menos 6 caracteres" });
  }

  try {
    const senha_hash = await bcrypt.hash(senha, 12);
    const papel = 0;

    // MariaDB: sem RETURNING. Faz INSERT e depois SELECT pelo insertId.
    const [result] = await pool.query(
      `INSERT INTO \`Usuarios\` (\`nome\`, \`email\`, \`senha_hash\`, \`papel\`)
       VALUES (?, ?, ?, ?)`,
      [String(nome).trim(), String(email).trim().toLowerCase(), senha_hash, papel]
    );

    const newId = result.insertId;

    const [rows] = await pool.query(
      `SELECT \`id\`, \`nome\`, \`email\`, \`papel\`
       FROM \`Usuarios\`
       WHERE \`id\` = ?`,
      [newId]
    );

    const user = rows[0];

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
    // MariaDB duplicate key: ER_DUP_ENTRY (errno 1062)
    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
      return res.status(409).json({ erro: "email já cadastrado" });
    }
    return res.status(500).json({ erro: "erro interno" });
  }
});

router.post("/login", recaptchaMiddleware, async (req, res) => {
  const { email, senha } = req.body ?? {};
  if (!email || !senha) return res.status(400).json({ erro: "email e senha são obrigatórios" });

  try {
    const [rows] = await pool.query(
      `SELECT \`id\`, \`nome\`, \`email\`, \`senha_hash\`, \`papel\`
       FROM \`Usuarios\`
       WHERE \`email\` = ?`,
      [String(email).trim().toLowerCase()]
    );

    if (!rows.length) return res.status(401).json({ erro: "credenciais inválidas" });

    const user = rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: "credenciais inválidas" });

    const access_token = signAccessToken(user);
    const refresh_token = signRefreshToken(user);
    setRefreshCookie(res, req, refresh_token);

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
  const refresh = req.cookies?.[REFRESH_COOKIE];
  if (!refresh) return res.status(401).json({ erro: "refresh ausente" });

  try {
    const payload = jwt.verify(refresh, JWT_REFRESH_SECRET);
    if (payload.tipo !== "refresh") return res.status(400).json({ erro: "refresh inválido" });

    const [rows] = await pool.query(
      `SELECT \`id\`, \`nome\`, \`email\`, \`papel\`
       FROM \`Usuarios\`
       WHERE \`id\` = ?`,
      [payload.sub]
    );

    if (!rows.length) return res.status(401).json({ erro: "usuário não existe mais" });

    const user = rows[0];
    const new_access = signAccessToken(user);

    return res.json({
      token_type: "Bearer",
      access_token: new_access,
      expires_in: JWT_ACCESS_EXPIRES,
    });
  } catch {
    clearRefreshCookie(res, req);
    return res.status(401).json({ erro: "refresh inválido ou expirado" });
  }
});

router.post("/logout", async (req, res) => {
  clearRefreshCookie(res, req);
  return res.status(204).end();
});

export default router;