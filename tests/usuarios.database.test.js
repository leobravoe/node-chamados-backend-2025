import { pool } from "../src/database/db-mysql.js";
import { buildUsuariosCases } from "./builders/buildUsuariosCases.js";
import { runCasesSequentially } from "./helpers/runCasesSequentially.js";
import { uniqueEmail } from "./helpers/uniqueEmail.js";
describe("Banco - Usuarios - restrições de integridade", () => {
    afterAll(async () => {
        await pool.end();
    });
    test("deve aceitar e rejeitar casos importantes de Usuarios", async () => {
        const cases = buildUsuariosCases();
        await runCasesSequentially(pool, cases);
    });
    test("não deve permitir email duplicado", async () => {
        const email = uniqueEmail("duplicado");
        await pool.query(
            "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
            ["Teste 1", email, "hash123", 0]
        );
        await expect(
            pool.query(
                "INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)",
                ["Teste 2", email, "hash456", 0]
            )
        ).rejects.toBeTruthy();
    });
});
