import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chamadosRouter from "./routes/chamados.routes.js";
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// armazenamento de arquivos enviados (pasta na raiz /uploads)
app.use('/uploads', express.static('./uploads'));

app.get("/", (_req, res) => {
    res.json({
        LISTAR: "GET /api/chamados",
        MOSTRAR: "GET /api/chamados/:id",
        CRIAR: "POST /api/chamados  BODY: { Usuarios_id: number, texto: 'string', estado?: 'a'|'f', url_imagem?: 'string' }",
        SUBSTITUIR: "PUT /api/chamados/:id  BODY: { Usuarios_id: number, texto: 'string', estado: 'a'|'f', url_imagem?: 'string' }",
        ATUALIZAR: "PATCH /api/chamados/:id  BODY: { Usuarios_id?: number, texto?: 'string', estado?: 'a'|'f', url_imagem?: 'string' }",
        DELETAR: "DELETE /api/chamados/:id",
    });
});

app.use("/api/chamados", chamadosRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log("CORS configurado: permissivo (aceita qualquer origem).");
});