import { AppError } from "../errors/AppError.js";
import { UsuarioModel } from "./usuario.model.js";

class AuthModel {
    constructor({ id, papel, nome, isAdmin } = {}) {
        this.id = id;
        this.papel = papel;
        this.nome = nome ?? null;
        this.isAdmin = Boolean(isAdmin);
    }

    static fromRequestUser(user) {
        const id = Number(user?.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw AppError.unauthorized("não autenticado");
        }

        const papel = Number(user?.papel);

        return new AuthModel({
            id,
            papel,
            nome: user?.nome,
            isAdmin: papel === UsuarioModel.ROLES.ADMIN,
        });
    }
}

export { AuthModel };
