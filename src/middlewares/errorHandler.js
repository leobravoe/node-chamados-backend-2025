import multer from "multer";
import { AppError } from "../errors/AppError.js";
import { ErrorView } from "../views/error.view.js";

const isJsonSyntaxError = (err) => err instanceof SyntaxError && "body" in err;

const normalizeError = (err) => {
    if (err instanceof AppError) {
        return { statusCode: err.statusCode, message: err.message };
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return { statusCode: 400, message: "imagem deve ter no máximo 5MB" };
        }

        return { statusCode: 400, message: "upload inválido" };
    }

    if (isJsonSyntaxError(err)) {
        return { statusCode: 400, message: "JSON inválido" };
    }

    if (err?.message?.includes("não permitida pelo CORS")) {
        return { statusCode: 403, message: err.message };
    }

    const statusCode = Number(err?.statusCode || err?.status || 500);
    const message = statusCode >= 500 ? "erro interno" : err?.message || "requisição inválida";

    return { statusCode, message };
};

const errorHandler = (err, _req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const { statusCode, message } = normalizeError(err);

    if (statusCode >= 500 && process.env.NODE_ENV !== "test") {
        console.error(err);
    }

    return res.status(statusCode).json(ErrorView.render(message));
};

export { errorHandler };
