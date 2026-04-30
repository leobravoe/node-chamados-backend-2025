import { AppError } from "../errors/AppError.js";
import { AuthModel } from "../models/auth.model.js";
import { ChamadoModel } from "../models/chamado.model.js";
import { chamadosRepository } from "../repositories/chamados.repository.js";
import { fileStorageService } from "./fileStorage.service.js";

class ChamadosService {
    constructor(repository = chamadosRepository, storage = fileStorageService) {
        this.repository = repository;
        this.storage = storage;
    }

    async listAll(query = {}) {
        const filters = ChamadoModel.validateListFilters(query);
        return this.repository.listAll(filters);
    }

    async getById(idParam) {
        const id = ChamadoModel.requirePositiveId(idParam);
        const chamado = await this.repository.findById(id);

        if (!chamado) {
            throw AppError.notFound();
        }

        return chamado;
    }

    async create({ body, user, file, baseUrl }) {
        const actor = AuthModel.fromRequestUser(user);
        const { texto, estado } = ChamadoModel.validateCreatePayload(body);
        let urlImagem = null;

        try {
            urlImagem = await this.storage.saveUploadedFile(file, baseUrl);

            return await this.repository.create({
                usuarioId: actor.id,
                texto,
                estado,
                urlImagem,
            });
        } catch (err) {
            if (urlImagem) {
                await this.storage.removeByPublicUrl(urlImagem);
            }

            throw err;
        }
    }

    async replace(idParam, { body, user, file, baseUrl }) {
        const id = ChamadoModel.requirePositiveId(idParam);
        const actor = AuthModel.fromRequestUser(user);
        const { texto, estado } = ChamadoModel.validatePutPayload(body);
        const chamado = await this.findVisibleChamadoOrFail(id, actor);
        const urlImagemAntiga = chamado.url_imagem;
        let urlImagemNova = urlImagemAntiga;
        let criouNovaImagem = false;

        try {
            if (file) {
                urlImagemNova = await this.storage.saveUploadedFile(file, baseUrl);
                criouNovaImagem = true;
            }

            const updated = await this.repository.update(id, {
                texto,
                estado,
                urlImagem: urlImagemNova,
            });

            if (!updated) {
                throw AppError.notFound();
            }

            if (criouNovaImagem && urlImagemAntiga && urlImagemAntiga !== urlImagemNova) {
                await this.storage.removeByPublicUrl(urlImagemAntiga);
            }

            return this.repository.findById(id);
        } catch (err) {
            if (criouNovaImagem && urlImagemNova) {
                await this.storage.removeByPublicUrl(urlImagemNova);
            }

            throw err;
        }
    }

    async patch(idParam, { body, user, file, baseUrl }) {
        const id = ChamadoModel.requirePositiveId(idParam);
        const actor = AuthModel.fromRequestUser(user);
        const patch = ChamadoModel.validatePatchPayload(body, Boolean(file));
        const chamado = await this.findVisibleChamadoOrFail(id, actor);
        const urlImagemAntiga = chamado.url_imagem;
        let urlImagemNova = urlImagemAntiga;
        let criouNovaImagem = false;

        try {
            if (file) {
                urlImagemNova = await this.storage.saveUploadedFile(file, baseUrl);
                criouNovaImagem = true;
            } else if (patch.removeImage) {
                urlImagemNova = null;
            }

            const updated = await this.repository.update(id, {
                texto: patch.texto ?? chamado.texto,
                estado: patch.estado ?? chamado.estado,
                urlImagem: urlImagemNova,
            });

            if (!updated) {
                throw AppError.notFound();
            }

            if (urlImagemAntiga && urlImagemAntiga !== urlImagemNova) {
                await this.storage.removeByPublicUrl(urlImagemAntiga);
            }

            return this.repository.findById(id);
        } catch (err) {
            if (criouNovaImagem && urlImagemNova) {
                await this.storage.removeByPublicUrl(urlImagemNova);
            }

            throw err;
        }
    }

    async delete(idParam, { user }) {
        const id = ChamadoModel.requirePositiveId(idParam);
        const actor = AuthModel.fromRequestUser(user);
        const chamado = await this.repository.findById(id);

        if (!chamado) {
            throw AppError.notFound();
        }

        if (!actor.isAdmin) {
            throw AppError.notFound("Somente administradores podem remover chamados");
        }

        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw AppError.notFound();
        }

        if (chamado.url_imagem) {
            await this.storage.removeByPublicUrl(chamado.url_imagem);
        }
    }

    async findVisibleChamadoOrFail(id, actor) {
        const chamado = await this.repository.findById(id);

        if (!chamado) {
            throw AppError.notFound();
        }

        if (!actor.isAdmin && chamado.Usuarios_id !== actor.id) {
            throw AppError.notFound();
        }

        return chamado;
    }
}

const chamadosService = new ChamadosService();

export { ChamadosService, chamadosService };
