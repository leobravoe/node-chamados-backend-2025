import { AppError } from "../errors/AppError.js";

class UsuarioModel {
    static ROLES = Object.freeze({
        USER: 0,
        ADMIN: 1,
    });

    static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    constructor({ id, nome, email, papel, senha_hash, data_criacao, data_atualizacao } = {}) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.papel = papel;
        this.senha_hash = senha_hash;
        this.data_criacao = data_criacao;
        this.data_atualizacao = data_atualizacao;
    }

    static normalizeName(nome) {
        return typeof nome === "string" ? nome.trim() : "";
    }

    static normalizeEmail(email) {
        return typeof email === "string" ? email.trim().toLowerCase() : "";
    }

    static validateRegisterPayload(payload = {}) {
        const nome = UsuarioModel.normalizeName(payload.nome);
        const email = UsuarioModel.normalizeEmail(payload.email);
        const senha = typeof payload.senha === "string" ? payload.senha : "";

        if (!nome || !email || !senha) {
            throw AppError.badRequest("nome, email e senha são obrigatórios");
        }

        if (!UsuarioModel.EMAIL_REGEX.test(email)) {
            throw AppError.badRequest("email inválido");
        }

        if (senha.length < 6) {
            throw AppError.badRequest("senha deve ter pelo menos 6 caracteres");
        }

        return { nome, email, senha };
    }

    static validateLoginPayload(payload = {}) {
        const email = UsuarioModel.normalizeEmail(payload.email);
        const senha = typeof payload.senha === "string" ? payload.senha : "";

        if (!email || !senha) {
            throw AppError.badRequest("email e senha são obrigatórios");
        }

        if (!UsuarioModel.EMAIL_REGEX.test(email)) {
            throw AppError.badRequest("email inválido");
        }

        return { email, senha };
    }

    static fromDatabase(row) {
        return row ? new UsuarioModel(row) : null;
    }

    static toPublicUser(user) {
        return UsuarioModel.fromDatabase(user)?.toPublicJSON() ?? null;
    }

    static isDuplicateEmailError(err) {
        return err?.code === "ER_DUP_ENTRY" || err?.errno === 1062 || err?.code === "23505";
    }

    toPublicJSON() {
        return {
            id: this.id,
            nome: this.nome,
            email: this.email,
            papel: this.papel,
        };
    }
}

export { UsuarioModel };
