import { AppError } from "../errors/AppError.js";

const notFoundHandler = (req, _res, next) => {
    next(AppError.notFound(`Rota ${req.method} ${req.originalUrl} não encontrada`));
};

export { notFoundHandler };
