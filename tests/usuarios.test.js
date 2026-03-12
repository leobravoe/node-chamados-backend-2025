import request from "supertest"; // importa o SuperTest para simular requisições HTTP no app
import { app } from "../src/app.js"; // importa a instância do app que será testada

const USER = { nome: "Usuario Teste", email: "user@test.com", senha: "senha123" }; // define um usuário padrão para os testes

describe("Usuários (auth)", () => { // agrupa testes de autenticação/usuários

    test("register: cria usuário (ou 409 se já existir)", async () => { // teste de registro
        const res = await request(app).post("/api/usuarios/register").send(USER); // chama POST /register enviando o usuário no body
        expect([201, 409]).toContain(res.status); // aceita 201 (criado) ou 409 (conflito: já existe)

        if (res.status === 201) { // se realmente criou agora
            expect(res.body).toHaveProperty("access_token"); // valida que veio um access token no body
            expect(res.body.user.email).toBe(USER.email); // valida que o email retornado é o do usuário criado
            expect(res.headers["set-cookie"]?.join(";") || "").toContain("refresh_token="); // valida que o header Set-Cookie contém refresh_token
        } // fecha o if
    }); // fecha o teste de register

    test("login: autentica e seta cookie refresh", async () => { // teste de login + cookie de refresh
        await request(app).post("/api/usuarios/register").send(USER); // garante que o usuário existe (pode ser 201/409)

        const res = await request(app) // inicia requisição de login
            .post("/api/usuarios/login") // rota: POST /login
            .send({ email: USER.email, senha: USER.senha }); // envia email/senha no body

        expect(res.status).toBe(200); // valida login OK
        expect(res.body).toHaveProperty("access_token"); // valida que recebeu access token
        expect(res.headers["set-cookie"]?.join(";") || "").toContain("refresh_token="); // valida que o header Set-Cookie contém refresh_token
    }); // fecha o teste de login

    test("refresh: funciona com cookie (agent)", async () => { // teste do endpoint de refresh usando cookies persistidos
        const agent = request.agent(app); // cria um “agent” do SuperTest (mantém cookies entre chamadas)

        await agent.post("/api/usuarios/register").send(USER); // registra (ou confirma existência) usando o agent

        // cookie do refresh é garantido pelo LOGIN // observação: o cookie de refresh só vem após logar
        const loginRes = await agent // faz login com o agent para capturar Set-Cookie automaticamente
            .post("/api/usuarios/login") // rota de login
            .send({ email: USER.email, senha: USER.senha }); // credenciais

        expect(loginRes.status).toBe(200); // valida login OK

        const refreshRes = await agent.post("/api/usuarios/refresh").send(); // chama /refresh (o cookie vai junto automaticamente)
        expect(refreshRes.status).toBe(200); // valida refresh OK
        expect(refreshRes.body).toHaveProperty("access_token"); // valida que o refresh retornou novo access token
    }); // fecha o teste de refresh

    test("logout: responde 204", async () => { // teste de logout (deve limpar cookie e retornar 204)
        const agent = request.agent(app); // cria agent para manter cookies (necessário para logout baseado em cookie)

        await agent.post("/api/usuarios/register").send(USER); // garante usuário registrado
        await agent // faz login para obter cookie de refresh
            .post("/api/usuarios/login") // rota de login
            .send({ email: USER.email, senha: USER.senha }); // credenciais

        const res = await agent.post("/api/usuarios/logout").send(); // chama /logout (cookie vai junto)
        expect(res.status).toBe(204); // valida retorno 204 No Content
    }); // fecha o teste de logout
    
}); // fecha o describe "Usuários (auth)"