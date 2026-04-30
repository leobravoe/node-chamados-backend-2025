import { AppError } from "../errors/AppError.js";

class ChamadoModel {
    static ESTADOS = Object.freeze({
        ABERTO: "a",
        FINALIZADO: "f",
    });

    static ESTADOS_VALIDOS = new Set(Object.values(ChamadoModel.ESTADOS));

    constructor({
        id,
        Usuarios_id,
        nome,
        texto,
        estado,
        url_imagem,
        data_criacao,
        data_atualizacao,
    } = {}) {
        this.id = id;
        this.Usuarios_id = Usuarios_id;
        this.nome = nome;
        this.texto = texto;
        this.estado = estado;
        this.url_imagem = url_imagem;
        this.data_criacao = data_criacao;
        this.data_atualizacao = data_atualizacao;
    }

    static fromDatabase(row) {
        return row ? new ChamadoModel(row) : null;
    }

    static parsePositiveId(value) {
        const id = Number(value);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    static requirePositiveId(value) {
        const id = ChamadoModel.parsePositiveId(value);

        if (!id) {
            throw AppError.badRequest("id inválido");
        }

        return id;
    }

    static isEstadoValido(estado) {
        return ChamadoModel.ESTADOS_VALIDOS.has(estado);
    }

    static normalizeTexto(texto) {
        return typeof texto === "string" ? texto.trim() : "";
    }

    static requireTexto(texto, message) {
        const textoNormalizado = ChamadoModel.normalizeTexto(texto);

        if (!textoNormalizado) {
            throw AppError.badRequest(message);
        }

        return textoNormalizado;
    }

    static validateCreatePayload(payload = {}) {
        const texto = ChamadoModel.requireTexto(
            payload.texto,
            "Campos obrigatórios: texto (string não vazia) e estado ('a' ou 'f' - se ausente, assume 'a')"
        );
        const estado = payload.estado ?? ChamadoModel.ESTADOS.ABERTO;

        if (!ChamadoModel.isEstadoValido(estado)) {
            throw AppError.badRequest(
                "Campos obrigatórios: texto (string não vazia) e estado ('a' ou 'f' - se ausente, assume 'a')"
            );
        }

        return { texto, estado };
    }

    static validatePutPayload(payload = {}) {
        const texto = ChamadoModel.requireTexto(
            payload.texto,
            "Para PUT, envie texto (string não vazia) e estado ('a' | 'f'); imagem é opcional."
        );

        if (!ChamadoModel.isEstadoValido(payload.estado)) {
            throw AppError.badRequest(
                "Para PUT, envie texto (string não vazia) e estado ('a' | 'f'); imagem é opcional."
            );
        }

        return { texto, estado: payload.estado };
    }

    static isImageRemovalValue(value) {
        return (
            value === null || (typeof value === "string" && value.trim().toLowerCase() === "null")
        );
    }

    static validatePatchPayload(payload = {}, hasFile = false) {
        const hasTexto = Object.prototype.hasOwnProperty.call(payload, "texto");
        const hasEstado = Object.prototype.hasOwnProperty.call(payload, "estado");
        const hasUrlImagem = Object.prototype.hasOwnProperty.call(payload, "url_imagem");
        const removeImage = hasUrlImagem && ChamadoModel.isImageRemovalValue(payload.url_imagem);

        if (hasUrlImagem && !removeImage) {
            throw AppError.badRequest(
                "Para alterar imagem via PATCH, envie um arquivo em 'imagem' ou url_imagem = null para remover."
            );
        }

        if (hasFile && removeImage) {
            throw AppError.badRequest("Envie uma nova imagem ou url_imagem = null, não ambos.");
        }

        if (!hasTexto && !hasEstado && !hasFile && !removeImage) {
            throw AppError.badRequest("envie ao menos um campo para atualizar");
        }

        const patch = {
            texto: undefined,
            estado: undefined,
            removeImage,
        };

        if (hasTexto) {
            patch.texto = ChamadoModel.requireTexto(
                payload.texto,
                "texto deve ser string não vazia"
            );
        }

        if (hasEstado) {
            if (!ChamadoModel.isEstadoValido(payload.estado)) {
                throw AppError.badRequest("estado deve ser 'a' ou 'f'");
            }

            patch.estado = payload.estado;
        }

        return patch;
    }

    static validateListFilters(query = {}) {
        if (query.estado === undefined) {
            return {};
        }

        if (!ChamadoModel.isEstadoValido(query.estado)) {
            throw AppError.badRequest("estado deve ser 'a' ou 'f'");
        }

        return { estado: query.estado };
    }

    toJSON() {
        return {
            id: this.id,
            Usuarios_id: this.Usuarios_id,
            nome: this.nome,
            texto: this.texto,
            estado: this.estado,
            url_imagem: this.url_imagem,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
        };
    }
}

export { ChamadoModel };
