import { pool } from "../database/db-mysql.js";
import { ChamadoModel } from "../models/chamado.model.js";

const SELECT_CHAMADO_COM_USUARIO = `
  SELECT \`Chamados\`.*, \`Usuarios\`.\`nome\`
  FROM \`Chamados\`
  JOIN \`Usuarios\` ON \`Chamados\`.\`Usuarios_id\` = \`Usuarios\`.\`id\`
`;

class ChamadosRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listAll({ estado } = {}) {
        const params = [];
        const where = [];

        if (estado) {
            where.push("`Chamados`.`estado` = ?");
            params.push(estado);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const [rows] = await this.db.query(
            `${SELECT_CHAMADO_COM_USUARIO}
       ${whereSql}
       ORDER BY \`Chamados\`.\`estado\`, \`Chamados\`.\`data_atualizacao\` ASC`,
            params
        );

        return rows.map((row) => ChamadoModel.fromDatabase(row));
    }

    async findById(id) {
        const [rows] = await this.db.query(
            `${SELECT_CHAMADO_COM_USUARIO}
       WHERE \`Chamados\`.\`id\` = ?`,
            [id]
        );

        return ChamadoModel.fromDatabase(rows[0]);
    }

    async create({ usuarioId, texto, estado, urlImagem }) {
        const [result] = await this.db.query(
            `INSERT INTO \`Chamados\` (\`Usuarios_id\`, \`texto\`, \`estado\`, \`url_imagem\`)
       VALUES (?, ?, ?, ?)`,
            [usuarioId, texto, estado, urlImagem]
        );

        return this.findById(result.insertId);
    }

    async update(id, { texto, estado, urlImagem }) {
        const [result] = await this.db.query(
            `UPDATE \`Chamados\`
       SET \`texto\` = ?,
           \`estado\` = ?,
           \`url_imagem\` = ?,
           \`data_atualizacao\` = CURRENT_TIMESTAMP
       WHERE \`id\` = ?`,
            [texto, estado, urlImagem, id]
        );

        return result.affectedRows > 0;
    }

    async delete(id) {
        const [result] = await this.db.query(`DELETE FROM \`Chamados\` WHERE \`id\` = ?`, [id]);
        return result.affectedRows > 0;
    }
}

const chamadosRepository = new ChamadosRepository();

export { ChamadosRepository, chamadosRepository };
