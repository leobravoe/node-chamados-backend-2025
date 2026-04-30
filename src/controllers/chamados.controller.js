import { chamadosService } from "../services/chamados.service.js";
import { ChamadoView } from "../views/chamado.view.js";

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

class ChamadosController {
    constructor(service = chamadosService) {
        this.service = service;
    }

    list = async (req, res) => {
        const chamados = await this.service.listAll(req.query ?? {});
        return res.json(ChamadoView.renderMany(chamados));
    };

    getById = async (req, res) => {
        const chamado = await this.service.getById(req.params.id);
        return res.json(ChamadoView.render(chamado));
    };

    create = async (req, res) => {
        const chamado = await this.service.create({
            body: req.body ?? {},
            user: req.user,
            file: req.file,
            baseUrl: getBaseUrl(req),
        });

        return res.status(201).json(ChamadoView.render(chamado));
    };

    replace = async (req, res) => {
        const chamado = await this.service.replace(req.params.id, {
            body: req.body ?? {},
            user: req.user,
            file: req.file,
            baseUrl: getBaseUrl(req),
        });

        return res.json(ChamadoView.render(chamado));
    };

    patch = async (req, res) => {
        const chamado = await this.service.patch(req.params.id, {
            body: req.body ?? {},
            user: req.user,
            file: req.file,
            baseUrl: getBaseUrl(req),
        });

        return res.json(ChamadoView.render(chamado));
    };

    delete = async (req, res) => {
        await this.service.delete(req.params.id, { user: req.user });
        return res.status(204).end();
    };
}

const chamadosController = new ChamadosController();

export { ChamadosController, chamadosController };
