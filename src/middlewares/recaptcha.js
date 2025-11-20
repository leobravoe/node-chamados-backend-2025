// src/middlewares/recaptcha.js
// -----------------------------------------------------------------------------
// Middleware para validar o token do Google reCAPTCHA enviado pelo front.
// Espera encontrar o token em req.body.recaptchaToken (JSON ou multipart).
// Usa a API oficial do Google: https://www.google.com/recaptcha/api/siteverify
// -----------------------------------------------------------------------------

import dotenv from "dotenv";

dotenv.config();

const { RECAPTCHA_SECRET_KEY } = process.env;

if (!RECAPTCHA_SECRET_KEY) {
    console.warn(
        "[WARN] RECAPTCHA_SECRET_KEY não definida. " +
        "A verificação de reCAPTCHA ficará DESATIVADA."
    );
}

/**
 * Middleware de validação do reCAPTCHA.
 * - Se RECAPTCHA_SECRET_KEY não estiver configurada, apenas chama next() (modo permissivo).
 * - Se não vier token → 400.
 * - Se Google responder erro ou success=false → 400/403.
 */
export async function recaptchaMiddleware(req, res, next) {
    try {
        // Se não tiver secret configurada, não bloqueia (ajuda em dev).
        if (!RECAPTCHA_SECRET_KEY) {
            return next();
        }

        // O token pode vir como:
        // - JSON comum (login/register): req.body.recaptchaToken
        // - multipart/form-data (FormData): também em req.body.recaptchaToken
        const recaptchaToken =
            req.body?.recaptchaToken ||
            req.body?.["g-recaptcha-response"];

        if (!recaptchaToken) {
            return res.status(400).json({
                erro: "reCAPTCHA é obrigatório.",
            });
        }

        // Monta o corpo x-www-form-urlencoded exigido pela API do Google
        const params = new URLSearchParams();
        params.append("secret", RECAPTCHA_SECRET_KEY);
        params.append("response", recaptchaToken);
        // Opcional: associar IP do cliente
        // params.append("remoteip", req.ip);

        const googleRes = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            }
        );

        if (!googleRes.ok) {
            console.error(
                "Falha HTTP ao verificar reCAPTCHA:",
                googleRes.status,
                googleRes.statusText
            );
            return res
                .status(502)
                .json({ erro: "falha ao verificar reCAPTCHA" });
        }

        const body = await googleRes.json();

        // Para reCAPTCHA v2, checamos apenas `success`.
        // (Se usar v3, aí vale checar score/action também.)
        if (!body.success) {
            console.warn("reCAPTCHA inválido:", body);
            return res
                .status(403)
                .json({ erro: "verificação de reCAPTCHA falhou" });
        }

        // Opcional: anexar info do captcha no req para logging/auditoria
        req.recaptcha = body;

        return next();
    } catch (err) {
        console.error("Erro interno ao verificar reCAPTCHA:", err);
        return res
            .status(500)
            .json({ erro: "erro interno ao verificar reCAPTCHA" });
    }
}
