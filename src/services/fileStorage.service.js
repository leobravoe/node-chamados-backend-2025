import fs from "fs";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "path";
import { UPLOADS_DIR, UPLOADS_PUBLIC_PATH } from "../config/paths.js";

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXTENSIONS_BY_MIME = Object.freeze({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
});

const getSafeExtension = (file) => {
    const originalExtension = path.extname(file.originalname || "").toLowerCase();

    if (originalExtension && originalExtension.length <= 10) {
        return originalExtension;
    }

    return EXTENSIONS_BY_MIME[file.mimetype] || "";
};

const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").replace(/\/$/, "");

class FileStorageService {
    async saveUploadedFile(file, baseUrl) {
        if (!file) return null;

        const filename = `${Date.now()}-${randomUUID()}${getSafeExtension(file)}`;
        const filePath = path.join(UPLOADS_DIR, filename);

        await writeFile(filePath, file.buffer);

        return `${normalizeBaseUrl(baseUrl)}${UPLOADS_PUBLIC_PATH}/${filename}`;
    }

    async removeByPublicUrl(urlImagem) {
        if (!urlImagem) return;

        try {
            const parsed = new URL(urlImagem, "http://local");

            if (!parsed.pathname.startsWith(`${UPLOADS_PUBLIC_PATH}/`)) {
                return;
            }

            const filename = path.basename(parsed.pathname);
            const filePath = path.resolve(UPLOADS_DIR, filename);

            if (!filePath.startsWith(`${UPLOADS_DIR}${path.sep}`)) {
                return;
            }

            await unlink(filePath);
        } catch {
            // Remoção de arquivo é best-effort: o registro no banco não deve falhar por arquivo ausente.
        }
    }
}

const fileStorageService = new FileStorageService();

export { FileStorageService, fileStorageService };
