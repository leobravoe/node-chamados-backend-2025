import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Limite global: vale pra /api inteiro
export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,     // janela de 5 min
  limit: 600,                  // 600 req / 5 min / IP (ajuste conforme uso)
  standardHeaders: "draft-7",  // manda RateLimit-* (padrão moderno)
  legacyHeaders: false,        // desliga X-RateLimit-*
  message: { erro: "Muitas requisições. Tente novamente em instantes." },
});

// Limite para rotas sensíveis de autenticação
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 min
  limit: 60,                   // 60 tentativas / 15 min / IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de autenticação. Aguarde alguns minutos." },
});

export const userLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 min
  limit: 120,                  // 12 req/min
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.uid) return `uid:${req.user.uid}`;
    return ipKeyGenerator(req.ip); // <-- normaliza IPv4/IPv6 corretamente
  },
  message: { erro: "Você fez muitas requisições. Reduza o ritmo." },
});
