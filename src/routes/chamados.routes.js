import { Router } from "express";
import { chamadosController } from "../controllers/chamados.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { recaptchaMiddleware } from "../middlewares/recaptcha.js";
import { uploadImagem } from "../middlewares/upload.js";

const router = Router();

/**
 * @openapi
 * /api/chamados:
 *   get:
 *     tags: [Chamados]
 *     summary: Lista todos os chamados
 *     description: Retorna os chamados ordenados por estado e data_atualizacao.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: estado
 *         in: query
 *         required: false
 *         description: Filtra chamados por estado
 *         schema:
 *           type: string
 *           enum: [a, f]
 *     responses:
 *       200:
 *         description: Lista de chamados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chamado'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get("/", asyncHandler(chamadosController.list));

/**
 * @openapi
 * /api/chamados/{id}:
 *   get:
 *     tags: [Chamados]
 *     summary: Busca um chamado por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Chamado encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get("/:id", asyncHandler(chamadosController.getById));

/**
 * @openapi
 * /api/chamados:
 *   post:
 *     tags: [Chamados]
 *     summary: Cria um novo chamado
 *     description: |
 *       Cria um chamado para o usuário autenticado.
 *       Aceita upload opcional de imagem.
 *       Se o campo estado não for enviado, assume "a".
 *       Esta rota passa por recaptchaMiddleware.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ChamadoCreateMultipart'
 *     responses:
 *       201:
 *         description: Chamado criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post(
    "/",
    uploadImagem.single("imagem"),
    recaptchaMiddleware,
    asyncHandler(chamadosController.create)
);

/**
 * @openapi
 * /api/chamados/{id}:
 *   put:
 *     tags: [Chamados]
 *     summary: Atualiza completamente um chamado
 *     description: |
 *       Atualiza texto, estado e opcionalmente a imagem.
 *       Usuário comum só pode atualizar o próprio chamado.
 *       Administrador pode atualizar qualquer chamado.
 *       Esta rota passa por recaptchaMiddleware.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ChamadoPutMultipart'
 *     responses:
 *       200:
 *         description: Chamado atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Não encontrado ou sem permissão de acesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put(
    "/:id",
    uploadImagem.single("imagem"),
    recaptchaMiddleware,
    asyncHandler(chamadosController.replace)
);

/**
 * @openapi
 * /api/chamados/{id}:
 *   patch:
 *     tags: [Chamados]
 *     summary: Atualiza parcialmente um chamado
 *     description: |
 *       Atualização parcial de chamado.
 *       Envie ao menos um campo.
 *       Para trocar a imagem, envie um arquivo em "imagem".
 *       Para remover a imagem, envie "url_imagem = null" em JSON ou "url_imagem = null" no multipart.
 *       Usuário comum só pode atualizar o próprio chamado.
 *       Administrador pode atualizar qualquer chamado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ChamadoPatchMultipart'
 *     responses:
 *       200:
 *         description: Chamado atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chamado'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Não encontrado ou sem permissão de acesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.patch("/:id", uploadImagem.single("imagem"), asyncHandler(chamadosController.patch));

/**
 * @openapi
 * /api/chamados/{id}:
 *   delete:
 *     tags: [Chamados]
 *     summary: Remove um chamado
 *     description: |
 *       Remove um chamado e a imagem associada, se existir.
 *       No código atual, apenas administradores podem remover chamados.
 *       Quando o usuário não é administrador, a implementação retorna 404 e não 403.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       204:
 *         description: Chamado removido com sucesso
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Não encontrado ou usuário sem perfil suficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsUser'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete("/:id", asyncHandler(chamadosController.delete));

export default router;
