// src/server.js
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({ quiet: true });

const PORT = process.env.PORT || 3000;
const externalUrl = process.env.RENDER_EXTERNAL_URL;

const server = app.listen(PORT, () => {
  const baseUrl = externalUrl || `http://localhost:${PORT}`;
  console.log(`Servidor rodando em ${baseUrl}`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

export { server };