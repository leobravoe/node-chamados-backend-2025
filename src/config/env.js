import dotenv from "dotenv";

dotenv.config({ quiet: true });

const parseCsv = (value) =>
    String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const port = process.env.PORT || "3000";
const defaultAllowedOrigins = [
    `http://localhost:${port}`,
    "http://localhost:5173",
    "https://leobravoe.github.io",
];

const env = Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
    port,
    externalUrl: process.env.RENDER_EXTERNAL_URL,
    allowedOrigins: process.env.CORS_ORIGINS
        ? parseCsv(process.env.CORS_ORIGINS)
        : defaultAllowedOrigins,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
});

export { env };
