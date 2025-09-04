DROP DATABASE IF EXISTS chamados_api_db;
CREATE DATABASE chamados_api_db;
\c chamados_api_db

CREATE TABLE Usuarios (
  id                SERIAL       NOT NULL PRIMARY KEY,
  nome              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  senha_hash        VARCHAR(255) NOT NULL,
  papel             SMALLINT     NOT NULL CHECK (papel IN (0,1)),  -- 0=aluno, 1=professor
  data_criacao      TIMESTAMP    DEFAULT now(),
  data_atualizacao  TIMESTAMP    DEFAULT now()
);

CREATE TABLE Chamados (
  id                SERIAL       NOT NULL PRIMARY KEY,
  Usuarios_id       BIGINT       NOT NULL REFERENCES Usuarios(id),
  texto             VARCHAR(255) NOT NULL,
  estado            CHAR(1)      NOT NULL CHECK (estado IN ('a','f')), -- a=aberto, f=fechado
  urlImagem         VARCHAR(255),
  data_criacao      TIMESTAMP    DEFAULT now(),
  data_atualizacao  TIMESTAMP    DEFAULT now()
);

INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES('Usuário', 'user@user.com.br', '123', 0);
INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES('Admin', 'admin@admin.com.br', '123', 1);

INSERT INTO Chamados (Usuarios_id, texto, estado) VALUES(1, 'Preciso de ajuda com JS', 'a');