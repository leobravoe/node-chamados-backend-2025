const buildChamadosCases = (validUserId) => {
    return [
        {
            description: "chamado válido com estado a",
            sql: "INSERT INTO Chamados (Usuarios_id, texto, estado, url_imagem) VALUES (?, ?, ?, ?)",
            params: [validUserId, "Chamado válido", "a", null],
            shouldPass: true,
        },
        {
            description: "texto null",
            sql: "INSERT INTO Chamados (Usuarios_id, texto, estado, url_imagem) VALUES (?, ?, ?, ?)",
            params: [validUserId, null, "a", null],
            shouldPass: false,
        },
        {
            description: "estado inválido",
            sql: "INSERT INTO Chamados (Usuarios_id, texto, estado, url_imagem) VALUES (?, ?, ?, ?)",
            params: [validUserId, "Chamado inválido", "x", null],
            shouldPass: false,
        },
        {
            description: "usuario inexistente",
            sql: "INSERT INTO Chamados (Usuarios_id, texto, estado, url_imagem) VALUES (?, ?, ?, ?)",
            params: [999999999, "FK inválida", "a", null],
            shouldPass: false,
        },
    ];
};
export { buildChamadosCases };
