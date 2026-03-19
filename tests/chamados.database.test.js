import { pool } from "../src/database/db-mysql.js";
import { createValidDbUser } from "./helpers/createValidDbUser.js";
import { buildChamadosCases } from "./builders/buildChamadosCases.js";
import { runCasesSequentially } from "./helpers/runCasesSequentially.js";
describe("Banco - Chamados - restrições de integridade", () => {
    let validUserId;
    beforeAll(async () => {
        const user = await createValidDbUser();
        validUserId = user.id;
    });
    afterAll(async () => {
        await pool.end();
    });
    test("deve aceitar e rejeitar casos importantes de Chamados", async () => {
        const cases = buildChamadosCases(validUserId);
        await runCasesSequentially(pool, cases);
    });
});
