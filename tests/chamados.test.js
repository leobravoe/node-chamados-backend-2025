import request from "supertest"; // importa o SuperTest (biblioteca para testar APIs HTTP chamando o app direto)
import bcrypt from "bcryptjs"; // importa o bcryptjs (para gerar hash de senha no teste)
import { app } from "../src/app.js"; // importa a instância do app (Express/Fastify/etc.) que será testada
import { pool } from "../src/database/db-mysql.js"; // importa o pool de conexões do MySQL (para queries diretas no teste)

const USER = { nome: "Usuario Chamados", email: "chamados.user@test.com", senha: "senha123" }; // define um usuário “comum” de teste
const ADMIN = { nome: "Admin Teste", email: "admin@test.com", senha: "admin123" }; // define um usuário “admin” de teste

describe("Chamados (CRUD)", () => { // agrupa os testes relacionados ao CRUD de chamados
    afterAll(async () => { // hook do Jest: roda uma vez ao final de TODOS os testes deste describe
        await pool.end(); // encerra o pool de conexões (evita “handle aberto” e travar o Jest)
    }); // fecha o afterAll

    test("cria chamado e lista", async () => { // define o teste: criar um chamado e confirmar que ele aparece na listagem
        await request(app).post("/api/usuarios/register").send(USER); // registra usuário (pode retornar 201 ou 409 se já existir)

        const login = await request(app) // inicia uma requisição HTTP (via SuperTest) para o app
            .post("/api/usuarios/login") // define método/rota: POST /login
            .send({ email: USER.email, senha: USER.senha }); // envia credenciais no body (JSON)

        expect(login.status).toBe(200); // valida que o login funcionou (HTTP 200)
        const token = login.body.access_token; // pega o access token retornado no body (para autenticar nas rotas protegidas)

        const created = await request(app) // inicia outra requisição HTTP no app
            .post("/api/chamados") // define método/rota: POST /chamados (criação)
            .set("Authorization", `Bearer ${token}`) // adiciona header Authorization com Bearer token (autenticação)
            .send({ texto: "Ajuda com Jest", estado: "a" }); // envia os dados do chamado no body

        expect(created.status).toBe(201); // valida que o chamado foi criado (HTTP 201 Created)

        const list = await request(app) // inicia requisição para listar chamados
            .get("/api/chamados") // define método/rota: GET /chamados (listagem)
            .set("Authorization", `Bearer ${token}`); // autentica a requisição de listagem

        expect(list.status).toBe(200); // valida que a listagem retornou OK (HTTP 200)
        expect(list.body.some((c) => c.id === created.body.id)).toBe(true); // valida que o ID criado aparece em algum item da lista
    }); // fecha o teste "cria chamado e lista"

    test("delete exige admin", async () => { // define o teste: deletar deve exigir admin
        await request(app).post("/api/usuarios/register").send(USER); // registra o usuário comum
        const loginUser = await request(app) // inicia login do usuário comum
            .post("/api/usuarios/login") // rota de login
            .send({ email: USER.email, senha: USER.senha }); // credenciais do usuário comum
        const userToken = loginUser.body.access_token; // guarda o token do usuário comum

        const created = await request(app) // cria um chamado com usuário comum
            .post("/api/chamados") // rota de criação de chamado
            .set("Authorization", `Bearer ${userToken}`) // autentica com token do usuário comum
            .send({ texto: "Para apagar", estado: "a" }); // dados do chamado que depois tentaremos apagar

        const delFail = await request(app) // tenta deletar o chamado com usuário NÃO-admin
            .delete(`/api/chamados/${created.body.id}`) // rota DELETE com o id do chamado
            .set("Authorization", `Bearer ${userToken}`); // autentica com token do usuário comum
        expect(delFail.status).toBe(404); // espera falhar (neste projeto, não-admin recebe 404; poderia ser 403 em outras APIs)

        // upsert admin fixo (para não depender de Date.now) // comentário original: garante admin estável para o teste
        const senha_hash = await bcrypt.hash(ADMIN.senha, 12); // gera hash da senha do admin (12 = custo do bcrypt)
        // executa um UPSERT no banco para garantir que existe um usuário admin com esse email (sem depender de rotas externas)
        await pool.query( // roda uma query SQL diretamente no MySQL
            // SQL: insere na tabela `Usuarios` definindo papel=1 (admin)
            `INSERT INTO \`Usuarios\` (\`nome\`, \`email\`, \`senha_hash\`, \`papel\`)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE \`senha_hash\`=VALUES(\`senha_hash\`), \`papel\`=1`,
            // parâmetros da query (evita SQL injection e facilita substituir valores)
            [ADMIN.nome, ADMIN.email, senha_hash] // valores que serão aplicados nos placeholders (?, ?, ?)
        ); // fecha a chamada do pool.query

        const loginAdmin = await request(app) // inicia login do admin
            .post("/api/usuarios/login") // rota de login
            .send({ email: ADMIN.email, senha: ADMIN.senha }); // credenciais do admin “fixo”
        expect(loginAdmin.status).toBe(200); // valida que o login do admin funcionou

        const adminToken = loginAdmin.body.access_token; // pega o token do admin
        const delOk = await request(app) // tenta deletar novamente, agora como admin
            .delete(`/api/chamados/${created.body.id}`) // DELETE no chamado criado
            .set("Authorization", `Bearer ${adminToken}`); // autentica com token de admin
        expect(delOk.status).toBe(204); // valida sucesso sem conteúdo (HTTP 204 No Content)
    }); // fecha o teste "delete exige admin"
}); // fecha o describe "Chamados (CRUD)"