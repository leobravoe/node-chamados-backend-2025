SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS "Usuarios" (
    "id"                SERIAL        PRIMARY KEY,
    "nome"              VARCHAR(255)  NOT NULL,
    "email"             VARCHAR(255)  NOT NULL UNIQUE,
    "senha_hash"        VARCHAR(255)  NOT NULL,
    "papel"             SMALLINT      NOT NULL CHECK ("papel" IN (0,1)),
    "data_criacao"      TIMESTAMP     NOT NULL DEFAULT now(),
    "data_atualizacao"  TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Chamados" (
    "id"                SERIAL        PRIMARY KEY,
    "Usuarios_id"       INTEGER       NOT NULL REFERENCES "Usuarios"("id"),
    "texto"             VARCHAR(255)  NOT NULL,
    "estado"            CHAR(1)       NOT NULL CHECK ("estado" IN ('a','f')),
    "url_imagem"        VARCHAR(255),
    "data_criacao"      TIMESTAMP     NOT NULL DEFAULT now(),
    "data_atualizacao"  TIMESTAMP     NOT NULL DEFAULT now()
);

INSERT INTO "Usuarios" ("nome", "email", "senha_hash", "papel") VALUES
('Usuário',                'user@user.com.br',             '$2b$12$B3qSsXRpc1DMcFzEK6PztuVSFc09DfRzByVPAFDWDsbvRphxxmGU6', 0),
('Admin',                  'admin@admin.com.br',           '$2b$12$Tcy09TkzUmQEsh7A/IDxteT.6Za0JhHEHNHXeYOf.JC6noyi.kKvW', 1);

INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado") VALUES
(1,  'Preciso de ajuda com JS', 'a'),
(1,  'Erro ao instalar dependências no npm',          'a'),
(2,  'Dúvida sobre rotas no Express',                 'f'),
(1,  'Como organizar a fila por tempo de criação?',   'a'),
(2,  'Falha ao conectar no banco Postgres',           'a'),
(1,  'Revisar critérios de encerramento de chamado',  'f'),
(2,  'Problema com CORS no navegador',                'a'),
(1,  'Como validar preço >= 0 no backend?',           'a'),
(2,  'PUT vs PATCH: quando usar cada um?',            'f'),
(1,  'Padronizar mensagens de erro da API',           'a'),
(2, 'Timeout ao fazer fetch no front',                'a');

INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado", "url_imagem") VALUES
(1, 'Layout da lista não carrega no CSS',            'a', '/img/wireframe-lista.png'),
(2, 'Bug ao atualizar produto (PUT)',                'f', '/img/bug-put.png'),
(1, 'Imagem não aparece no README',                  'a', '/img/readme-img.png'),
(2, 'Organização das rotas em /api/produtos',        'a', '/img/rotas.png'),
(1,  'Ícone quebra em telas pequenas',                'f', '/img/icone-responsivo.png'),
(2,  'Mensagem de validação pouco clara',             'a', '/img/validacao-msg.png'),
(1,  'Dúvida sobre COALESCE no SQL',                  'a', '/img/sql-coalesce.png'),
(2,  'Diferença entre 200 e 201 no retorno',          'f', '/img/http-status.png');