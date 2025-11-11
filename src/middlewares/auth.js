// src/middlewares/auth.js
// --------------------------------------------------------------------------------------
// Middleware de autenticação por JWT (access token).
// - Requer a variável de ambiente JWT_ACCESS_SECRET (chave de verificação do token).
// - Espera receber o cabeçalho: Authorization: Bearer <token>.
//   * Se estiver ausente ou fora do formato, responde 401.
//   * Se o token for válido, anexa os dados do usuário em req.user e chama next().
// --------------------------------------------------------------------------------------

import jwt from "jsonwebtoken";   // Biblioteca para assinar/verificar JSON Web Tokens (JWT)
import dotenv from "dotenv";      // Carrega variáveis do arquivo .env para process.env

dotenv.config();                  // Inicializa o dotenv para disponibilizar JWT_ACCESS_SECRET
const { JWT_ACCESS_SECRET } = process.env; // Segredo usado para verificar a assinatura do access token

export function authMiddleware(req, res, next) {
  try {
    // Lê o cabeçalho Authorization enviado pelo cliente (ex.: "Bearer eyJhbGciOiJIUzI1NiIs...")
    const authorization_header = req.headers["authorization"];

    // Valida a presença do cabeçalho e o formato "Bearer <token>"
    if (!authorization_header || !authorization_header.startsWith("Bearer ")) {
      return res.status(401).json({ erro: "token ausente" });
    }

    // Extrai apenas o token removendo o prefixo "Bearer "
    const token = authorization_header.slice(7);

    // Verifica assinatura e validade do token usando o segredo.
    // Se a assinatura for inválida ou o token estiver expirado, jwt.verify lança erro.
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);

    // Coloca dentro de req.body o usuário logado
    // (Obs.: o código, corretamente, anexa o usuário em req.user, não em req.body.)
    // Popula dados mínimos para autorização nas próximas camadas (controllers/rotas).
    req.user = { id: payload.sub, papel: payload.papel, nome: payload.nome };

    // Prossegue o fluxo para o próximo middleware/handler
    next();
  } catch {
    // Qualquer falha na leitura/validação do token resulta em "não autorizado"
    return res.status(401).json({ erro: "token inválido" });
  }
}
