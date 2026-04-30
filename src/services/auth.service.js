import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { UsuarioModel } from "../models/usuario.model.js";
import { tokenService } from "./token.service.js";
import { usuariosRepository } from "../repositories/usuarios.repository.js";

class AuthService {
    constructor(repository = usuariosRepository, tokens = tokenService) {
        this.repository = repository;
        this.tokens = tokens;
    }

    async register(payload) {
        const { nome, email, senha } = UsuarioModel.validateRegisterPayload(payload);
        const senhaHash = await bcrypt.hash(senha, 12);

        try {
            const user = await this.repository.create({
                nome,
                email,
                senhaHash,
                papel: UsuarioModel.ROLES.USER,
            });

            return this.createSession(user);
        } catch (err) {
            if (UsuarioModel.isDuplicateEmailError(err)) {
                throw AppError.conflict("email já cadastrado");
            }

            throw err;
        }
    }

    async login(payload) {
        const { email, senha } = UsuarioModel.validateLoginPayload(payload);
        const user = await this.repository.findByEmailWithPassword(email);

        if (!user) {
            throw AppError.unauthorized("credenciais inválidas");
        }

        const passwordMatches = await bcrypt.compare(senha, user.senha_hash);

        if (!passwordMatches) {
            throw AppError.unauthorized("credenciais inválidas");
        }

        return this.createSession(user);
    }

    async refresh(refreshToken) {
        if (!refreshToken) {
            throw AppError.unauthorized("refresh ausente");
        }

        const payload = this.tokens.verifyRefreshToken(refreshToken);
        const user = await this.repository.findPublicById(payload.sub);

        if (!user) {
            throw AppError.unauthorized("usuário não existe mais", "REFRESH_USER_NOT_FOUND");
        }

        return {
            accessToken: this.tokens.signAccessToken(user),
            expiresIn: env.jwtAccessExpires,
        };
    }

    createSession(user) {
        const publicUser = UsuarioModel.toPublicUser(user);

        return {
            accessToken: this.tokens.signAccessToken(publicUser),
            refreshToken: this.tokens.signRefreshToken(publicUser),
            expiresIn: env.jwtAccessExpires,
            user: publicUser,
        };
    }
}

const authService = new AuthService();

export { AuthService, authService };
