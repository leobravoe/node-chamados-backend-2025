// src/commands/reset-database.js (ESM)
'use strict';

import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- 1. CONFIGURAÇÃO ---
dotenv.config();

const {
    // Conexão principal com o banco
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_USER: dbUser,
    DB_PASSWORD: dbPassword,
    DB_DATABASE: dbName,

    // Conexão administrativa (para reset)
    PG_DATABASE_ADMIN: dbAdminName = 'postgres', // Padrão 'postgres' para segurança
    DB_DATABASE_ADMIN_PASSWORD: dbAdminPassword,

    // Caminho do arquivo de Schema
    DB_DATABASE_FILE_PATH: dbSchemaFilePath,

} = process.env;

// Resolve o caminho do arquivo .sql
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFilePath = dbSchemaFilePath
    ? path.resolve(process.cwd(), dbSchemaFilePath)
    : path.resolve(__dirname, '../database', 'banco.sql');


// --- 2. LÓGICA PRINCIPAL ---

async function main() {
    const baseConfig = {
        host: dbHost,
        port: Number(dbPort),
        user: dbUser,
    };

    let adminClient, appClient;

    try {
        // ETAPA 1: Conectar como admin para apagar e recriar o banco
        adminClient = new Client({
            ...baseConfig,
            database: dbAdminName,
            password: dbAdminPassword || dbPassword, // Usa a senha de admin, se não, a padrão
        });
        await adminClient.connect();

        console.log(`- Recriando o banco de dados "${dbName}"...`);
        const safeDbName = adminClient.escapeIdentifier(dbName);

        await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [dbName]);
        await adminClient.query(`DROP DATABASE IF EXISTS ${safeDbName}`);
        await adminClient.query(`CREATE DATABASE ${safeDbName}`);
        console.log(`- Banco de dados recriado com sucesso.`);
        await adminClient.end();

        // ETAPA 2: Conectar ao novo banco para aplicar o schema
        console.log(`- Aplicando SQL do arquivo: ${sqlFilePath}`);
        const sql = await fs.readFile(sqlFilePath, 'utf8');
        appClient = new Client({ ...baseConfig, database: dbName, password: dbPassword });
        await appClient.connect();
        await appClient.query(sql);
        console.log(`- SQL aplicado com sucesso.`);

    } catch (error) {
        // Trata o erro de arquivo não encontrado como um aviso, não um erro fatal
        if (error.code === 'ENOENT') {
            console.warn(`⚠️ AVISO: O banco foi recriado, mas o arquivo de schema não foi encontrado.`);
            return; // Finaliza a execução com sucesso parcial
        }
        // Para outros erros, lança para o bloco de captura principal
        throw error;
    } finally {
        // Garante que todas as conexões sejam fechadas, mesmo se ocorrer um erro
        if (adminClient) await adminClient.end();
        if (appClient) await appClient.end();
    }
}

// --- 3. EXECUÇÃO ---

(async () => {
    try {
        await main();
        console.log('✅ Processo de reset finalizado com sucesso.');
    } catch (error) {
        console.error('❌ ERRO FATAL: Não foi possível resetar o banco de dados.');
        console.error(error);
        process.exit(1);
    }
})();