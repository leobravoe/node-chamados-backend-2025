import { AppError } from "../errors/AppError.js";
import { tokenService } from "../services/token.service.js";

export function authMiddleware(req, res, next) {
    try {
        const authorizationHeader = req.get("authorization");
        const tokenMatch = authorizationHeader?.match(/^Bearer\s+(.+)$/i);

        if (!tokenMatch) {
            throw AppError.unauthorized("token ausente");
        }

        const payload = tokenService.verifyAccessToken(tokenMatch[1]);
        req.user = { id: payload.sub, papel: payload.papel, nome: payload.nome };

        return next();
    } catch (err) {
        return next(err);
    }
}
