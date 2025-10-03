// server.js — versão permissiva de CORS (aceita qualquer origem)
// -----------------------------------------------------------------------------
// Esta versão usa o middleware `cors()` sem opções — isso permite requisições
// de qualquer origem (origin = '*'). É simples e útil para desenvolvimento
// local rápido, mas NÃO é seguro para produção sem restrições.
// -----------------------------------------------------------------------------
// IMPORTS
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chamadosRouter from "./routes/chamados.routes.js";
// carrega variáveis do .env (se existir)
dotenv.config();
// cria a aplicação Express
const app = express();
// -------------------- CORS SIMPLIFICADO --------------------
// Usando cors() sem opções: permite qualquer origem.
// Útil para desenvolvimento quando o front e o back podem rodar em hosts/ports
// diferentes e você não quer lidar com listas de origens agora.
app.use(cors());
// -----------------------------------------------------------------------------
// Observação importante:
// - Com esta configuração, o servidor responderá a requisições de qualquer origem.
// - Se você for usar cookies de autenticação (sessions), será necessário ajustar
//   a configuração para permitir credentials e não usar origin '*'.
// -----------------------------------------------------------------------------
// interpreta JSON no corpo das requisições (req.body)
app.use(express.json());
// ROTA DE BOAS-VINDAS (GET /)
app.get("/", (_req, res) => {
  res.json({
    LISTAR: "GET /api/chamados",
    MOSTRAR: "GET /api/chamados/:id",
    CRIAR: "POST /api/chamados  BODY: { Usuarios_id: number, texto: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    SUBSTITUIR: "PUT /api/chamados/:id  BODY: { Usuarios_id: number, texto: 'string', estado: 'a'|'f', urlImagem?: 'string' }",
    ATUALIZAR: "PATCH /api/chamados/:id  BODY: { Usuarios_id?: number, texto?: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    DELETAR: "DELETE /api/chamados/:id",
  });
});
// monta as rotas de chamados sob /api/chamados
app.use("/api/chamados", chamadosRouter);
// inicia o servidor (usa PORT do .env ou 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log("CORS configurado: permissivo (aceita qualquer origem).");
});
// -----------------------------------------------------------------------------
// DICAS RÁPIDAS:
// - Para desenvolvimento rápido: esta configuração é suficiente.
// - Para produção: substitua por uma lista de origens ou use variável de ambiente.
// - Se precisar enviar cookies entre front e back (cross-origin), use
//   `credentials: true` e origin dinâmica (será feito no futuro).
// -----------------------------------------------------------------------------
