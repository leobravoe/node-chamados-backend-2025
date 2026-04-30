import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
    const baseUrl = env.externalUrl || `http://localhost:${env.port}`;
    console.log(`Servidor rodando em ${baseUrl}`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

export { server };
