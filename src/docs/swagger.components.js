/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     refreshCookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: refresh_token
 *
 *   parameters:
 *     IdParam:
 *       name: id
 *       in: path
 *       required: true
 *       description: ID numérico do recurso
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 1
 *
 *   schemas:
 *     HealthResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: server online
 *       required:
 *         - status
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         erro:
 *           type: string
 *           example: erro interno
 *       required:
 *         - erro
 *
 *     UsuarioPublico:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: Usuário Teste
 *         email:
 *           type: string
 *           format: email
 *           example: user@test.com
 *         papel:
 *           type: integer
 *           description: 0 = usuário comum, 1 = administrador
 *           example: 0
 *       required:
 *         - id
 *         - nome
 *         - email
 *         - papel
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token_type:
 *           type: string
 *           example: Bearer
 *         access_token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         expires_in:
 *           type: string
 *           example: 15m
 *         user:
 *           $ref: '#/components/schemas/UsuarioPublico'
 *       required:
 *         - token_type
 *         - access_token
 *         - expires_in
 *         - user
 *
 *     RefreshResponse:
 *       type: object
 *       properties:
 *         token_type:
 *           type: string
 *           example: Bearer
 *         access_token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         expires_in:
 *           type: string
 *           example: 15m
 *       required:
 *         - token_type
 *         - access_token
 *         - expires_in
 *
 *     RegisterRequest:
 *       type: object
 *       properties:
 *         nome:
 *           type: string
 *           example: Usuário Teste
 *         email:
 *           type: string
 *           format: email
 *           example: user@test.com
 *         senha:
 *           type: string
 *           minLength: 6
 *           example: senha123
 *       required:
 *         - nome
 *         - email
 *         - senha
 *
 *     LoginRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@test.com
 *         senha:
 *           type: string
 *           example: senha123
 *       required:
 *         - email
 *         - senha
 *
 *     Chamado:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 10
 *         Usuarios_id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: Usuário Teste
 *         texto:
 *           type: string
 *           example: O computador do laboratório não está ligando.
 *         estado:
 *           type: string
 *           description: a = aberto, f = finalizado
 *           enum: [a, f]
 *           example: a
 *         url_imagem:
 *           type: string
 *           nullable: true
 *           example: http://localhost:3000/uploads/1710000000-123456789.png
 *         data_atualizacao:
 *           type: string
 *           format: date-time
 *           example: 2026-03-12T12:00:00.000Z
 *       required:
 *         - id
 *         - Usuarios_id
 *         - nome
 *         - texto
 *         - estado
 *
 *     ChamadoCreateMultipart:
 *       type: object
 *       properties:
 *         texto:
 *           type: string
 *           example: Projetor da sala 3 não funciona.
 *         estado:
 *           type: string
 *           description: Se ausente, assume "a"
 *           enum: [a, f]
 *           example: a
 *         imagem:
 *           type: string
 *           format: binary
 *       required:
 *         - texto
 *
 *     ChamadoPutMultipart:
 *       type: object
 *       properties:
 *         texto:
 *           type: string
 *           example: Texto atualizado do chamado
 *         estado:
 *           type: string
 *           enum: [a, f]
 *           example: f
 *         imagem:
 *           type: string
 *           format: binary
 *       required:
 *         - texto
 *         - estado
 *
 *     ChamadoPatchMultipart:
 *       type: object
 *       properties:
 *         texto:
 *           type: string
 *           example: Atualização parcial do texto
 *         estado:
 *           type: string
 *           enum: [a, f]
 *           example: f
 *         url_imagem:
 *           nullable: true
 *           description: Envie null no JSON ou "null" em multipart para remover a imagem atual
 *           example: null
 *         imagem:
 *           type: string
 *           format: binary
 *
 *   responses:
 *     BadRequest:
 *       description: Requisição inválida
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     Unauthorized:
 *       description: Não autenticado ou credenciais inválidas
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     NotFound:
 *       description: Recurso não encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     Conflict:
 *       description: Conflito de dados
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     TooManyRequestsGlobal:
 *       description: Limite global excedido
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             default:
 *               value:
 *                 erro: Muitas requisições. Tente novamente em instantes.
 *
 *     TooManyRequestsAuth:
 *       description: Limite das rotas de autenticação excedido
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             default:
 *               value:
 *                 erro: Muitas tentativas de autenticação. Aguarde alguns minutos.
 *
 *     TooManyRequestsUser:
 *       description: Limite das rotas de chamados excedido
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             default:
 *               value:
 *                 erro: Você fez muitas requisições. Reduza o ritmo.
 *
 *     InternalError:
 *       description: Erro interno do servidor
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

export {};
