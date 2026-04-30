import { env } from "./env.js";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const getRefreshCookieOptions = (req, { includeMaxAge = true } = {}) => {
    const options = {
        httpOnly: true,
        sameSite: env.isProduction ? "None" : "Lax",
        secure: env.isProduction,
        path: req.baseUrl || "/",
    };

    if (includeMaxAge) {
        options.maxAge = REFRESH_MAX_AGE;
    }

    return options;
};

export { REFRESH_COOKIE, REFRESH_MAX_AGE, getRefreshCookieOptions };
