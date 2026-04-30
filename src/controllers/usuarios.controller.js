import { REFRESH_COOKIE, getRefreshCookieOptions } from "../config/auth.js";
import { authService } from "../services/auth.service.js";
import { AuthView } from "../views/auth.view.js";

const setRefreshCookie = (res, req, token) => {
    res.cookie(REFRESH_COOKIE, token, getRefreshCookieOptions(req));
};

const clearRefreshCookie = (res, req) => {
    res.clearCookie(REFRESH_COOKIE, getRefreshCookieOptions(req, { includeMaxAge: false }));
};

class UsuariosController {
    constructor(service = authService) {
        this.service = service;
    }

    register = async (req, res) => {
        const session = await this.service.register(req.body);
        setRefreshCookie(res, req, session.refreshToken);

        return res.status(201).json(AuthView.renderSession(session));
    };

    login = async (req, res) => {
        const session = await this.service.login(req.body);
        setRefreshCookie(res, req, session.refreshToken);

        return res.json(AuthView.renderSession(session));
    };

    refresh = async (req, res) => {
        const refreshToken = req.cookies?.[REFRESH_COOKIE];

        try {
            const payload = await this.service.refresh(refreshToken);
            return res.json(AuthView.renderRefresh(payload));
        } catch (err) {
            if (refreshToken) {
                clearRefreshCookie(res, req);
            }

            throw err;
        }
    };

    logout = async (req, res) => {
        clearRefreshCookie(res, req);
        return res.status(204).end();
    };
}

const usuariosController = new UsuariosController();

export { UsuariosController, usuariosController };
