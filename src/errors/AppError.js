class AppError extends Error {
    constructor(statusCode, message, code = "APP_ERROR") {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }

    static badRequest(message, code = "BAD_REQUEST") {
        return new AppError(400, message, code);
    }

    static unauthorized(message, code = "UNAUTHORIZED") {
        return new AppError(401, message, code);
    }

    static forbidden(message, code = "FORBIDDEN") {
        return new AppError(403, message, code);
    }

    static notFound(message = "não encontrado", code = "NOT_FOUND") {
        return new AppError(404, message, code);
    }

    static conflict(message, code = "CONFLICT") {
        return new AppError(409, message, code);
    }
}

export { AppError };
