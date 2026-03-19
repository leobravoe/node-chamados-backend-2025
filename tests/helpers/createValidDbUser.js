import { pool } from "../../src/database/db-mysql.js";
import { uniqueEmail } from "./uniqueEmail.js";
const createValidDbUser = async () => {
    const email = uniqueEmail("db-user");
    const [result] = await pool.query(
        "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
        ["Usuário Banco", email, "hash123", 0]
    );
    return {
        id: result.insertId,
        email,
    };
};
export { createValidDbUser };
