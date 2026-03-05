-- MariaDB (recomendado): utf8mb4 + collation compatível
-- (Opcional)
-- CREATE DATABASE IF NOT EXISTS sua_base
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE sua_base;

CREATE TABLE IF NOT EXISTS `Usuarios` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `nome`             VARCHAR(255) NOT NULL,
  `email`            VARCHAR(255) NOT NULL,
  `senha_hash`       VARCHAR(255) NOT NULL,
  `papel`            TINYINT NOT NULL,
  `data_criacao`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_atualizacao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuarios_email` (`email`),
  CONSTRAINT `ck_usuarios_papel` CHECK (`papel` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Chamados` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `Usuarios_id`      INT NOT NULL,
  `texto`            VARCHAR(255) NOT NULL,
  `estado`           CHAR(1) NOT NULL,
  `url_imagem`       VARCHAR(255) NULL,
  `data_criacao`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_atualizacao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_chamados_usuarios_id` (`Usuarios_id`),
  CONSTRAINT `fk_chamados_usuarios`
    FOREIGN KEY (`Usuarios_id`) REFERENCES `Usuarios` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `ck_chamados_estado` CHECK (`estado` IN ('a','f'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Usuarios` (`nome`, `email`, `senha_hash`, `papel`) VALUES
('Admin',   'admin@admin.com.br', '$2b$12$Tcy09TkzUmQEsh7A/IDxteT.6Za0JhHEHNHXeYOf.JC6noyi.kKvW', 1),
('Usuário', 'user@user.com.br',   '$2b$12$B3qSsXRpc1DMcFzEK6PztuVSFc09DfRzByVPAFDWDsbvRphxxmGU6', 0);

INSERT INTO `Chamados` (`Usuarios_id`, `texto`, `estado`, `url_imagem`) VALUES
(1, 'Ajuda com JS',    'a', NULL),
(2, 'Ajuda com React', 'a', NULL);