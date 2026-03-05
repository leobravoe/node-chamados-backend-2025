// src/app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import chamadosRouter from "./routes/chamados.routes.js";
import usuariosRouter from "./routes/usuarios.routes.js";
import { authMiddleware } from "./middlewares/auth.js";
import { globalLimiter, authLimiter, userLimiter } from "./middlewares/rateLimiters.js";

dotenv.config({ quiet: true });

const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = ["http://localhost:5173", "https://leobravoe.github.io"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} não permitida pelo CORS`));
    },
    credentials: true,
  })
);

app.use("/api", globalLimiter);
app.use("/api/usuarios/login", authLimiter);
app.use("/api/usuarios/register", authLimiter);
app.use("/api/usuarios/refresh", authLimiter);

app.use("/uploads", express.static("./uploads"));

app.get("/", (_req, res) => res.json({ status: "server online" }));

app.use("/api/usuarios", usuariosRouter);
app.use("/api/chamados", authMiddleware, userLimiter, chamadosRouter);

export { app };