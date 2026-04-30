import { Router } from "express";
import { usuariosController } from "../controllers/usuarios.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { recaptchaMiddleware } from "../middlewares/recaptcha.js";

const router = Router();

/**
 * @openapi
 * /api/usuarios/register:
 *   post:
 *     tags: [Usuários]
 *     summary: Cadastra um novo usuário
 *     description: |
 *       Cria um novo usuário, gera access token JWT e define o cookie HTTP-only de refresh token.
 *       Esta rota passa por recaptchaMiddleware.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         headers:
 *           Set-Cookie:
 *             description: Cookie HTTP-only refresh_token
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsAuth'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post("/register", recaptchaMiddleware, asyncHandler(usuariosController.register));

/**
 * @openapi
 * /api/usuarios/login:
 *   post:
 *     tags: [Usuários]
 *     summary: Autentica um usuário
 *     description: |
 *       Autentica com email e senha, gera access token JWT e define o cookie HTTP-only de refresh token.
 *       Esta rota passa por recaptchaMiddleware.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         headers:
 *           Set-Cookie:
 *             description: Cookie HTTP-only refresh_token
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsAuth'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post("/login", recaptchaMiddleware, asyncHandler(usuariosController.login));

/**
 * @openapi
 * /api/usuarios/refresh:
 *   post:
 *     tags: [Usuários]
 *     summary: Gera novo access token a partir do refresh token
 *     description: Usa o cookie HTTP-only refresh_token para emitir novo access token.
 *     security:
 *       - refreshCookieAuth: []
 *     responses:
 *       200:
 *         description: Novo access token gerado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsAuth'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post("/refresh", asyncHandler(usuariosController.refresh));

/**
 * @openapi
 * /api/usuarios/logout:
 *   post:
 *     tags: [Usuários]
 *     summary: Efetua logout
 *     description: Remove o cookie refresh_token e encerra a sessão do cliente.
 *     responses:
 *       204:
 *         description: Logout realizado com sucesso
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsGlobal'
 */
router.post("/logout", asyncHandler(usuariosController.logout));

export default router;
