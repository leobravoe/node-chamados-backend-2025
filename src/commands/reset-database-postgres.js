import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const {
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE,
    DB_ADMIN_DATABASE = 'postgres',
    DB_ADMIN_PASSWORD,
    DB_DATABASE_FILE_PATH,
} = process.env;

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_DATABASE_FILE_PATH'];

for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        console.error(`❌ Erro: A variável de ambiente ${varName} não está definida.`);
        process.exit(1);
    }
}

const sqlFilePath = path.resolve(process.cwd(), DB_DATABASE_FILE_PATH);
const baseConfig = { host: DB_HOST, port: Number(DB_PORT), user: DB_USER };
const adminConfig = { ...baseConfig, database: DB_ADMIN_DATABASE, password: DB_ADMIN_PASSWORD || DB_PASSWORD };
const appConfig = { ...baseConfig, database: DB_DATABASE, password: DB_PASSWORD };

async function resetDatabase() {
    const adminClient = new Client(adminConfig);
    try {
        await adminClient.connect();
        console.log(`- Conectado como admin ao banco "${DB_ADMIN_DATABASE}".`);
        console.log(`- Derrubando conexões existentes com "${DB_DATABASE}"...`);
        await adminClient.query(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [DB_DATABASE]
        );
        console.log(`- Recriando o banco de dados "${DB_DATABASE}"...`);
        const dropQuery = `DROP DATABASE IF EXISTS ${DB_DATABASE}`;
        const createQuery = `CREATE DATABASE ${DB_DATABASE}`;
        await adminClient.query(dropQuery);
        await adminClient.query(createQuery);
        console.log(`- Banco de dados recriado com sucesso.`);
    } finally {
        await adminClient.end();
        console.log('- Conexão de admin encerrada.');
    }
}

async function applySchema() {
    let sql;
    try {
        console.log(`- Lendo SQL do arquivo: ${sqlFilePath}`);
        sql = await fs.readFile(sqlFilePath, 'utf8');
    } catch (error) {
        console.error(`❌ Erro fatal: Não foi possível ler o arquivo de schema em ${sqlFilePath}.`);
        throw error;
    }
    const appClient = new Client(appConfig);
    try {
        await appClient.connect();
        console.log(`- Conectado ao banco "${DB_DATABASE}" para aplicar o schema.`);
        await appClient.query(sql);
        console.log('- Schema SQL aplicado com sucesso.');
    } finally {
        await appClient.end();
        console.log('- Conexão da aplicação encerrada.');
    }
}

console.log('--- Iniciando processo de reset do banco de dados ---');
try {
    await resetDatabase();
    await applySchema();
    console.log('✅ Processo de reset finalizado com sucesso!');
} catch (error) {
    console.error('❌ ERRO FATAL: Não foi possível resetar o banco de dados.');
    console.error(error);
    process.exit(1);
}