SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS "Usuarios" (
    "id"                SERIAL       PRIMARY KEY,
    "nome"              VARCHAR(255) NOT NULL,
    "email"             VARCHAR(255) NOT NULL UNIQUE,
    "senha_hash"        VARCHAR(255) NOT NULL,
    "papel"             SMALLINT     NOT NULL CHECK ("papel" IN (0,1)),
    "data_criacao"      TIMESTAMP    NOT NULL DEFAULT now(),
    "data_atualizacao"  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Chamados" (
    "id"                SERIAL       PRIMARY KEY,
    "Usuarios_id"       INTEGER      NOT NULL REFERENCES "Usuarios"("id"),
    "texto"             VARCHAR(255) NOT NULL,
    "estado"            CHAR(1)      NOT NULL CHECK ("estado" IN ('a','f')),
    "url_imagem"         VARCHAR(255),
    "data_criacao"      TIMESTAMP    NOT NULL DEFAULT now(),
    "data_atualizacao"  TIMESTAMP    NOT NULL DEFAULT now()
);

INSERT INTO "Usuarios" ("nome", "email", "senha_hash", "papel") VALUES
('Usuário',                'user@user.com.br',             '$2b$12$hOa7C35BZpDh7kJYoCld9YbLRMsvIkVzvr3LMBDHT46/Kpx7/aEzW', 0),
('Admin',                  'admin@admin.com.br',           '$2b$12$uBy.SQ6EAxn/o/clzQHi.ydZM.v4sM78Rnd/DgwpLyGhkQltSy6n0', 1),
('Alice Silva',            'alice@exemplo.com.br',         '$2b$12$Bnqzpx4w6TaRk8ck5bHtrVmtKV/OmjJ/qWWqBPmKhSZ0aSgKvSOAj', 0),
('Bruno Lima',             'bruno@exemplo.com.br',         '$2b$12$lsvj7q7QCfCriYUh/UeagGUVtGiYCwMat4J5bnP.u7rb9hjp55rdL', 0),
('Carla Ferreira',         'carla.ferreira@exemplo.com.br','$2b$12$k7mmguOilastEwMXekVTw3v5Vt/2JGG53GmVocr0i7ZhlkFKrde1M', 1),
('Diego Santos',           'diego@exemplo.com.br',         '$2b$12$Ru95WQEgzFqBOfyAG34/6Nppels6CUKoe1ma7urinZiZLQbNCZEj9', 0),
('Eduarda Costa',          'eduarda@exemplo.com.br',       '$2b$12$4NrPZt6yNJEPQO2ApaF04kD7CY.LV9XWRQTBPF6KwSE39YcChbBKF', 0),
('Felipe Almeida',         'felipe@exemplo.com.br',        '$2b$12$XpRkEBpxXukNijvqNnyy.SQxJ3.olhNnK.1aT.Yl5d2JYp89dGINg', 0),
('Giselle Rocha',          'giselle@exemplo.com.br',       '$2b$12$VTqKt4ERLTmLRCGrJIfGVOwmGcEir9KDq7G5RWrnYRlBvHfw82jh7', 1),
('Henrique Martins',       'henrique@exemplo.com.br',      '$2b$12$hzzNU5mPWkgYoHe1RD0uYYTibS8lO/XXI1aVoYjEJ1zAw9lPQOUEJ', 0),
('Isabela Nunes',          'isabela@exemplo.com',          '$2b$12$GXQT1tXZD46SovxYIt8Gav6stqg/05PleFbmH.J3F2chAuiCVgcfz', 0),
('Joao Pedro Ramos',       'joao.ramos@exemplo.com.br',    '$2b$12$oXKiRh8ktUFaMTstKX/cCfDUAUT2SepSNwRdWtUenkwz1IwFL6V6b', 0),
('Karen Oliveira',         'karen@exemplo.com.br',         '$2b$12$9x2GHtGECKzuQCJS65.1klPkri2xpNTvbEZLDlrVsvVBLZp4cnKlc', 0),
('Luiz Fernando Teixeira', 'luiz.teixeira@exemplo.com.br', '$2b$12$woeItTdOln/h4lP8Dc65k1XqFI5fOlSADwHsQk/T50ES8K9I0dpn4', 1);

INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado") VALUES
(1,  'Preciso de ajuda com JS', 'a'),
(1,  'Erro ao instalar dependências no npm',          'a'),
(2,  'Dúvida sobre rotas no Express',                 'f'),
(3,  'Como organizar a fila por tempo de criação?',   'a'),
(4,  'Falha ao conectar no banco Postgres',           'a'),
(5,  'Revisar critérios de encerramento de chamado',  'f'),
(6,  'Problema com CORS no navegador',                'a'),
(7,  'Como validar preço >= 0 no backend?',           'a'),
(8,  'PUT vs PATCH: quando usar cada um?',            'f'),
(9,  'Padronizar mensagens de erro da API',           'a'),
(10, 'Timeout ao fazer fetch no front',               'a');

INSERT INTO "Chamados" ("Usuarios_id", "texto", "estado", "url_imagem") VALUES
(11, 'Layout da lista não carrega no CSS',            'a', '/img/wireframe-lista.png'),
(12, 'Bug ao atualizar produto (PUT)',                'f', '/img/bug-put.png'),
(13, 'Imagem não aparece no README',                  'a', '/img/readme-img.png'),
(14, 'Organização das rotas em /api/produtos',        'a', '/img/rotas.png'),
(3,  'Ícone quebra em telas pequenas',                'f', '/img/icone-responsivo.png'),
(4,  'Mensagem de validação pouco clara',             'a', '/img/validacao-msg.png'),
(5,  'Dúvida sobre COALESCE no SQL',                  'a', '/img/sql-coalesce.png'),
(6,  'Diferença entre 200 e 201 no retorno',          'f', '/img/http-status.png');