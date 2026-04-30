import { pool } from "../database/db-mysql.js";
import { UsuarioModel } from "../models/usuario.model.js";

class UsuariosRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async create({ nome, email, senhaHash, papel }) {
        const [result] = await this.db.query(
            `INSERT INTO \`Usuarios\` (\`nome\`, \`email\`, \`senha_hash\`, \`papel\`)
       VALUES (?, ?, ?, ?)`,
            [nome, email, senhaHash, papel]
        );

        return this.findPublicById(result.insertId);
    }

    async findPublicById(id) {
        const [rows] = await this.db.query(
            `SELECT \`id\`, \`nome\`, \`email\`, \`papel\`
       FROM \`Usuarios\`
       WHERE \`id\` = ?`,
            [id]
        );

        return UsuarioModel.fromDatabase(rows[0]);
    }

    async findByEmailWithPassword(email) {
        const [rows] = await this.db.query(
            `SELECT \`id\`, \`nome\`, \`email\`, \`senha_hash\`, \`papel\`
       FROM \`Usuarios\`
       WHERE \`email\` = ?`,
            [email]
        );

        return UsuarioModel.fromDatabase(rows[0]);
    }
}

const usuariosRepository = new UsuariosRepository();

export { UsuariosRepository, usuariosRepository };
