# AtendeAí — Fila de Ajuda em Sala (ajustado)

> Organize a fila de atendimento em aulas práticas: menos espera, mais visibilidade e justiça.

[![Node.js](https://img.shields.io/badge/node-%3E%3D16-green)](#) [![License](https://img.shields.io/badge/license-MIT-blue)](#)

## Sumário

1. [Visão rápida](#visão-rápida)
2. [Problema e objetivo](#problema-e-objetivo)
3. [Quem usa](#quem-usa)
4. [Funcionalidades (MVP)](#funcionalidades-mvp)
5. [Tecnologias](#tecnologias)
6. [Modelo de dados (rápido)](#modelo-de-dados-rápido)
7. [Como rodar localmente](#como-rodar-localmente)
8. [Endpoints principais](#endpoints-principais)
9. [Comandos úteis / scripts npm](#comandos-úteis--scripts-npm)
10. [Erros comuns & dicas](#erros-comuns--dicas)
11. [Como contribuir](#como-contribuir)
12. [Licença](#licença)

---

## Visão rápida

`AtendeAí` é uma API + protótipo para gerenciar uma fila de chamados em aulas práticas.

---

## Problema e objetivo

Em aulas práticas, alunos aguardam atendimento sem visibilidade da ordem e do tempo de espera. O objetivo é reduzir frustração e tornar o processo justo — primeiro por um protótipo em navegador (LocalStorage) e, em seguida, por uma API Express com PostgreSQL.

---

## Quem usa

* **Alunos**: abrir, editar e encerrar seus chamados.
* **Professores**: visualizar e encerrar quaisquer chamados.
* **Visitantes**: criar conta e fazer login.

---

## Funcionalidades (MVP)

* Autenticação simples (email/senha) — roles: aluno/professor
* Criar chamado (texto, imagem opcional)
* Listar chamados ordenados por data de criação
* Encerrar chamado (marcar como fechado)
* Versão cliente: protótipo em LocalStorage e futura versão em React

Critérios de aceite: criar → aparece com horário; encerrar → muda estado ou some da lista conforme filtro.

---

## Tecnologias

* **Back-end**: Node.js + Express
* **Banco (opcional)**: PostgreSQL (SQL já provisto para "Dia 0")
* **Front**: protótipo HTML/CSS/JS (evoluir para React)

---

## Modelo de dados (rápido)

Resumo: `Usuarios` (id, nome, email, senha_hash, papel, timestamps) e `Chamados` (id, Usuarios_id, texto, estado, urlImagem, timestamps). O README original contém SQL de criação com exemplos de inserts. (Fonte: README original). fileciteturn0file0

---

## Como rodar localmente

**Pré-requisitos**: Node.js (LTS), PostgreSQL (opcional se for usar LocalStorage).

1. Clone o repositório

```bash
git clone <seu-repo.git>
cd node-chamados-backend
```

2. Copie o `.env.example` para `.env` e ajuste as variáveis (ex.: DB_HOST, DB_USER, DB_PASSWORD, PORT).

3. Instale dependências

```bash
npm install
```

4. Rodar em modo desenvolvimento

```bash
npm run dev
# ou conforme package.json: node server.js ou npm start
```

5. Criar banco e tabelas

```bash
npm run reset-database
# ou execute o arquivo SQL: psql -U <user> -d <db> -f ./src/database/banco.sql
```

6. Testes rápidos com curl (exemplos abaixo em Endpoints principais).

---

## Endpoints principais (exemplos)

> Rota base: `http://localhost:<PORT>/api`

### Usuários

* `POST /api/usuarios` — criar usuário (body: `{ nome, email, senha }`)
* `POST /api/login` — autenticar (body: `{ email, senha }`) → retorna token/session

### Chamados

* `GET /api/chamados` — listar chamados (query: `?estado=a` para abertos)
* `GET /api/chamados/:id` — ver chamado
* `POST /api/chamados` — criar chamado (body: `{ texto, urlImagem? }`)
* `PUT /api/chamados/:id` — atualizar (substitui)
* `PATCH /api/chamados/:id` — atualizar parcialmente (ex.: `estado`)
* `DELETE /api/chamados/:id` — deletar

**Resposta de erro padrão**:

```json
{ "erro": "mensagem explicando o problema" }
```

---

## Comandos úteis / scripts npm

* `npm run dev` — roda em modo desenvolvimento
* `npm run reset-database` — cria/zera banco (ver package.json)
* `npm test` — (se houver) executar testes

---

## Erros comuns & dicas rápidas

* `req.body` undefined → falta `app.use(express.json())` ou Content-Type não definido.
* Conexão com banco → ver `.env` (host/port/user/senha).
* `relation does not exist` → executar SQL de criação das tabelas.
* Senhas em texto → usar `bcrypt` para hash (o projeto já exemplifica hashes didáticos).

---

## Como contribuir

1. Abra uma *issue* descrevendo o problema/feature.
2. Faça um fork, crie branch `feature/<nome>` e submeta um PR com descrição clara e passos para testar.
3. Mantenha commits pequenos e mensagens claras.

---

## Licença

MIT — sinta-se à vontade para usar/estudar o projeto. Modifique conforme necessidade.

---

## Observações finais

* Mantive o SQL de exemplo e os inserts no README original; para referência completa do esquema, consulte a seção "Plano de Dados (Dia 0)" do README original. 

<!-- Fim do README ajustado -->
