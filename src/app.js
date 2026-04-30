import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import chamadosRouter from "./routes/chamados.routes.js";
import usuariosRouter from "./routes/usuarios.routes.js";
import { env } from "./config/env.js";
import { UPLOADS_DIR } from "./config/paths.js";
import { AppError } from "./errors/AppError.js";
import { authMiddleware } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { globalLimiter, authLimiter, userLimiter } from "./middlewares/rateLimiters.js";
import { setupSwagger } from "./docs/swagger.js";

const app = express();

setupSwagger(app);

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (env.allowedOrigins.includes(origin)) return callback(null, true);
            return callback(AppError.forbidden(`Origin ${origin} não permitida pelo CORS`));
        },
        credentials: true,
    })
);

app.use("/api", globalLimiter);
app.use("/api/usuarios/login", authLimiter);
app.use("/api/usuarios/register", authLimiter);
app.use("/api/usuarios/refresh", authLimiter);

app.use("/uploads", express.static(UPLOADS_DIR));

/**
 * @openapi
 * /:
 *   get:
 *     tags: [Sistema]
 *     summary: Verifica se o servidor está online
 *     responses:
 *       200:
 *         description: Servidor online
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get("/", (_req, res) => res.json({ status: "server online" }));

app.use("/api/usuarios", usuariosRouter);
app.use("/api/chamados", authMiddleware, userLimiter, chamadosRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
