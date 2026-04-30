import multer from "multer";
import { AppError } from "../errors/AppError.js";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const uploadImagem = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE,
    },
    fileFilter: (_req, file, callback) => {
        if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
            return callback(AppError.badRequest("imagem deve ser JPEG, PNG, GIF ou WebP"));
        }

        return callback(null, true);
    },
});

export { MAX_IMAGE_SIZE, uploadImagem };
