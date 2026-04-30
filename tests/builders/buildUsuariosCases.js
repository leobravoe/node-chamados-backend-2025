// buildUsuariosCases.js
import { uniqueEmail } from "../helpers/uniqueEmail.js";
const buildUsuariosCases = () => {
    return [
        {
            description: "usuario comum válido",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: ["Usuário Válido", uniqueEmail("usuario-valido"), "hash123", 0],
            shouldPass: true,
        },
        {
            description: "usuario admin válido",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: ["Admin Válido", uniqueEmail("admin-valido"), "hash123", 1],
            shouldPass: true,
        },
        {
            description: "nome null",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: [null, uniqueEmail("nome-null"), "hash123", 0],
            shouldPass: false,
        },
        {
            description: "email null",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: ["Teste", null, "hash123", 0],
            shouldPass: false,
        },
        {
            description: "senha_hash null",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: ["Teste", uniqueEmail("senha-null"), null, 0],
            shouldPass: false,
        },
        {
            description: "papel inválido",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: ["Teste", uniqueEmail("papel-invalido"), "hash123", 9],
            shouldPass: false,
        },
        {
            description: "papel negativo",
            sql: "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            params: ["Teste", uniqueEmail("papel-invalido"), "hash123", -1],
            shouldPass: false,
        },
    ];
};
export { buildUsuariosCases };
