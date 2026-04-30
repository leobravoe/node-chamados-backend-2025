import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const requireSecret = (secret, name) => {
    if (!secret) {
        throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
    }

    return secret;
};

class TokenService {
    signAccessToken(user) {
        return jwt.sign(
            { sub: user.id, papel: user.papel, nome: user.nome },
            requireSecret(env.jwtAccessSecret, "JWT_ACCESS_SECRET"),
            { expiresIn: env.jwtAccessExpires }
        );
    }

    signRefreshToken(user) {
        return jwt.sign(
            { sub: user.id, tipo: "refresh" },
            requireSecret(env.jwtRefreshSecret, "JWT_REFRESH_SECRET"),
            { expiresIn: env.jwtRefreshExpires }
        );
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, requireSecret(env.jwtAccessSecret, "JWT_ACCESS_SECRET"));
        } catch {
            throw AppError.unauthorized("token inválido", "ACCESS_TOKEN_INVALID");
        }
    }

    verifyRefreshToken(token) {
        try {
            const payload = jwt.verify(
                token,
                requireSecret(env.jwtRefreshSecret, "JWT_REFRESH_SECRET")
            );

            if (payload.tipo !== "refresh") {
                throw AppError.badRequest("refresh inválido", "REFRESH_INVALID_TYPE");
            }

            return payload;
        } catch (err) {
            if (err instanceof AppError) {
                throw err;
            }

            throw AppError.unauthorized("refresh inválido ou expirado", "REFRESH_INVALID");
        }
    }
}

const tokenService = new TokenService();

export { TokenService, tokenService };
