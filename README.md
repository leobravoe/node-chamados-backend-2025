# AtendeAí — Fila de Ajuda em Sala

> Organize a fila de atendimento em aulas práticas: menos espera, mais visibilidade e justiça.

[![Node.js](https://img.shields.io/badge/node-%3E%3D16-green)](#) [![License](https://img.shields.io/badge/license-MIT-blue)](#)

## Sumário

1. [Visão rápida](#visão-rápida)
2. [Problema e objetivo](#problema-e-objetivo)
3. [Quem usa](#quem-usa)
4. [Funcionalidades (MVP)](#funcionalidades-mvp)
5. [Tecnologias](#tecnologias)
6. [Arquitetura](#arquitetura)
7. [Modelo de dados](#modelo-de-dados)
8. [Como rodar localmente](#como-rodar-localmente)
9. [Endpoints principais](#endpoints-principais)
10. [Comandos úteis / scripts npm](#comandos-úteis--scripts-npm)
11. [Erros comuns & dicas](#erros-comuns--dicas)
12. [Licença](#licença)

---

## Visão rápida

`AtendeAí` é uma API + protótipo para gerenciar uma fila de chamados em aulas práticas.

---

## Problema e objetivo

Em aulas práticas, alunos aguardam atendimento sem visibilidade da ordem e do tempo de espera. O objetivo é reduzir frustração e tornar o processo justo.

---

## Quem usa

- **Alunos**: abrir, editar e encerrar seus chamados.
- **Professores**: visualizar e encerrar quaisquer chamados.
- **Visitantes**: criar conta e fazer login.

---

## Funcionalidades (MVP)

- Autenticação simples (email/senha) — roles: aluno/professor
- Criar chamado (texto, imagem opcional)
- Listar chamados ordenados por estado e data de atualização
- Encerrar chamado (marcar como fechado)

Critérios de aceite: logar no sistema como aluno → criar chamado → chamado aparece com horário → logar no sistema como professor → encerrar chamado → o estado do chamado é alterado e pode sumir da lista conforme filtro aplicado.

---

## Tecnologias

- **Back-end**: Node.js + Express
- **Banco**: MariaDB/MySQL (`mysql2`) como caminho principal
- **Documentação**: Swagger/OpenAPI em `/docs`
- **Front**: React.js

---

## Arquitetura

O backend está organizado em camadas para separar responsabilidades:

- `routes`: define URLs, middlewares e documentação OpenAPI.
- `controllers`: traduz requisições/respostas HTTP.
- `services`: concentra regras de negócio, autenticação, upload e autorização.
- `repositories`: isola SQL e acesso ao banco.
- `models`: classes de domínio que representam, validam e normalizam dados.
- `views`: serializa respostas públicas da API.
- `middlewares`: autenticação, upload, rate limit, reCAPTCHA e tratamento global de erros.

---

## Modelo de dados

Resumo: `Usuarios` (id, nome, email, senha_hash, papel, timestamps) e `Chamados` (id, Usuarios_id, texto, estado, url_imagem, timestamps).

O schema principal fica em `src/database/banco-mysql.sql` e é aplicado por `npm run reset-database`.

---

## Como rodar localmente

**Pré-requisitos**: Node.js (LTS) e MariaDB/MySQL instalado.

1. Clone o repositório

```bash
git clone <seu-repo.git>
cd node-chamados-backend
```

2. Copie o `.env.example` para `.env` e ajuste as variáveis (ex.: DB_HOST, DB_USER, DB_PASSWORD, PORT).

```bash
copy .env.example .env
```

3. Instale dependências

```bash
npm install
```

4. Criar banco e tabelas

```bash
npm run reset-database
```

5. Rodar em modo desenvolvimento

```bash
npm run dev
```

6. Testes rápidos com curl (exemplos abaixo em Endpoints principais).

---

## Endpoints principais

> Rota base: `http://localhost:<PORT>/api`

### Usuários

- `POST /api/usuarios/register` — criar usuário (body: `{ nome, email, senha }`)
- `POST /api/usuarios/login` — autenticar (body: `{ email, senha }`) e receber access token
- `POST /api/usuarios/refresh` — renovar access token usando cookie HTTP-only
- `POST /api/usuarios/logout` — limpar cookie de refresh

### Chamados

- `GET /api/chamados` — listar chamados (query: `?estado=a` para abertos)
- `GET /api/chamados/:id` — ver chamado
- `POST /api/chamados` — criar chamado autenticado (`texto`, `estado?`, `imagem?`)
- `PUT /api/chamados/:id` — substituir texto/estado e opcionalmente imagem
- `PATCH /api/chamados/:id` — atualizar parcialmente; envie `url_imagem = null` para remover imagem
- `DELETE /api/chamados/:id` — deletar chamado como administrador

**Resposta de erro padrão**:

```json
{ "erro": "mensagem explicando o problema" }
```

---

## Comandos úteis / scripts npm

- `npm run dev` — roda em modo desenvolvimento
- `npm run reset-database` — cria/zera banco

---

## Erros comuns & dicas rápidas

- Conexão com banco → ver arquivo `.env` na raiz do projeto (host/port/user/senha).
- Arquivo `.env` não existe na raiz do projeto → criar arquivo `.env` na raiz do projeto com base no arquivo `.env.example`

---

## Licença

MIT — sinta-se à vontade para usar/estudar o projeto. Modifique conforme necessidade.
