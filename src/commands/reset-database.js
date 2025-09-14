// src/commands/reset-database.js (ESM)
'use strict';
import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const {
  PGHOST = 'localhost',
  PGPORT = '5432',
  PGUSER = 'postgres',
  PGPASSWORD = 'aluno',
  PGDATABASE_ADMIN = 'postgres',       // DB administrativo
  DB_DATABASE = 'chamados_api_db',     // DB alvo a recriar
  DB_DATABASE_FILE_NAME = 'banco.sql', // fallback se não tiver o PATH no .env
  DB_DATABASE_FILE_PATH: DB_DATABASE_FILE_PATH_ENV,
} = process.env;

// Se veio no .env, resolve relativo ao CWD (onde roda o `node`/`npm`).
// Senão, usa ../database/banco.sql relativo a este arquivo.
const DB_DATABASE_FILE_PATH = DB_DATABASE_FILE_PATH_ENV && DB_DATABASE_FILE_PATH_ENV.trim().length > 0
  ? path.resolve(process.cwd(), DB_DATABASE_FILE_PATH_ENV)
  : path.resolve(__dirname, '../database', DB_DATABASE_FILE_NAME);

async function run() {
  const admin = new Client({
    host: PGHOST,
    port: Number(PGPORT),
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE_ADMIN,
  });
  await admin.connect();

  await admin.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid();
  `, [DB_DATABASE]);

  await admin.query(`DROP DATABASE IF EXISTS ${quoteIdent(DB_DATABASE)};`);
  await admin.query(`CREATE DATABASE ${quoteIdent(DB_DATABASE)} WITH ENCODING 'UTF8' TEMPLATE template0;`);

  try {
    const sql = await fs.readFile(DB_DATABASE_FILE_PATH, 'utf8');
    const appClient = new Client({
      host: PGHOST,
      port: Number(PGPORT),
      user: PGUSER,
      password: PGPASSWORD,
      database: DB_DATABASE,
    });
    await appClient.connect();
    await appClient.query(sql);
    await appClient.end();
    console.log(`[OK] Schema aplicado: ${DB_DATABASE_FILE_PATH}`);
  } catch (e) {
    console.warn('[AVISO] Não foi possível aplicar o schema:', e.message, `\nArquivo: ${DB_DATABASE_FILE_PATH}`);
  }

  await admin.end();
  console.log(`[OK] Banco "${DB_DATABASE}" recriado.`);
}

function quoteIdent(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name)) {
    return `"${String(name).replace(/"/g, '""')}"`;
  }
  return name;
}

run().catch((err) => {
  console.error('[ERRO] Reset falhou:', err);
  process.exit(1);
});
