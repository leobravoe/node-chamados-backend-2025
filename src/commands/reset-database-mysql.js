import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  DB_ADMIN_DATABASE = 'mysql',
  DB_ADMIN_PASSWORD,
  DB_DATABASE_FILE_PATH,
} = process.env;

const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_DATABASE',
  'DB_DATABASE_FILE_PATH',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Erro: A variável de ambiente ${varName} não está definida.`);
    process.exit(1);
  }
}

const sqlFilePath = path.resolve(process.cwd(), DB_DATABASE_FILE_PATH);

const quoteIdent = (name) => `\`${String(name).replace(/`/g, '``')}\``;

const baseConfig = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  // Necessário para executar múltiplos comandos de uma vez (CREATE TABLE + INSERT + etc.)
  multipleStatements: true,
};

const adminConfig = {
  ...baseConfig,
  password: DB_ADMIN_PASSWORD || DB_PASSWORD,
  database: DB_ADMIN_DATABASE, // pode ser 'mysql' (ou qualquer DB existente)
};

const appConfig = {
  ...baseConfig,
  password: DB_PASSWORD,
  database: DB_DATABASE,
};

const withConnection = async (config, fn) => {
  const conn = await mysql.createConnection(config);
  try {
    await conn.ping();
    return await fn(conn);
  } finally {
    await conn.end();
  }
};

const resetDatabase = async () => {
  await withConnection(adminConfig, async (adminConn) => {
    console.log(`- Conectado como admin ao MariaDB (database="${DB_ADMIN_DATABASE}").`);

    // Best-effort: encerra conexões que estejam usando o banco alvo (exige privilégios PROCESS e KILL).
    console.log(`- Tentando encerrar conexões que estejam usando "${DB_DATABASE}"...`);
    try {
      const [rows] = await adminConn.query(
        `SELECT ID FROM INFORMATION_SCHEMA.PROCESSLIST
         WHERE DB = ? AND ID <> CONNECTION_ID()`,
        [DB_DATABASE]
      );

      for (const row of rows) {
        const id = Number(row.ID);
        if (Number.isInteger(id) && id > 0) {
          // KILL não aceita placeholder "?" aqui; interpolamos após validar inteiro.
          await adminConn.query(`KILL ${id}`);
        }
      }

      console.log(`- Conexões encerradas: ${rows.length}.`);
    } catch (err) {
      console.warn(
        '⚠️ Aviso: não foi possível encerrar conexões (sem privilégio PROCESS/KILL). Prosseguindo mesmo assim.'
      );
    }

    const dbIdent = quoteIdent(DB_DATABASE);

    console.log(`- Recriando o banco de dados ${dbIdent}...`);
    await adminConn.query(`DROP DATABASE IF EXISTS ${dbIdent}`);
    await adminConn.query(
      `CREATE DATABASE ${dbIdent} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    console.log(`- Banco de dados recriado com sucesso.`);
  });

  console.log('- Conexão de admin encerrada.');
};

const applySchema = async () => {
  let sql;

  try {
    console.log(`- Lendo SQL do arquivo: ${sqlFilePath}`);
    sql = await fs.readFile(sqlFilePath, 'utf8');
  } catch (error) {
    console.error(`❌ Erro fatal: Não foi possível ler o arquivo de schema em ${sqlFilePath}.`);
    throw error;
  }

  await withConnection(appConfig, async (appConn) => {
    console.log(`- Conectado ao banco "${DB_DATABASE}" para aplicar o schema.`);

    // Se seu arquivo tiver TRIGGERS/PROCEDURES com DELIMITER, talvez precise de um runner específico.
    // Para schema "normal" (CREATE TABLE/INSERT/ALTER), isso costuma funcionar bem.
    await appConn.query(sql);

    console.log('- Schema SQL aplicado com sucesso.');
  });

  console.log('- Conexão da aplicação encerrada.');
};

console.log('--- Iniciando processo de reset do banco de dados (MariaDB) ---');

try {
  await resetDatabase();
  await applySchema();
  console.log('✅ Processo de reset finalizado com sucesso!');
} catch (error) {
  console.error('❌ ERRO FATAL: Não foi possível resetar o banco de dados.');
  console.error(error);
  process.exit(1);
}