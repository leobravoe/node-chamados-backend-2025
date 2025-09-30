import { Client } from 'pg';               // Cliente PostgreSQL (biblioteca 'pg') para conectar e executar queries.
import fs from 'fs/promises';             // Módulo do Node para operações de arquivo usando Promises (readFile, etc).
import path from 'path';                  // Utilitário para manipular caminhos de arquivos.
import dotenv from 'dotenv';              // Carrega variáveis de ambiente de um arquivo .env para process.env.

dotenv.config();                          // Lê o arquivo .env (na raiz do projeto) e popula process.env.

const {
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE,
    DB_ADMIN_DATABASE = 'postgres',      // Se não definido, assume 'postgres' como banco admin padrão.
    DB_ADMIN_PASSWORD,
    DB_DATABASE_FILE_PATH,
} = process.env;                          // Extrai variáveis importantes do ambiente para uso no script.

/*
  Validação básica das variáveis essenciais.
  Se alguma variável importante não estiver definida, o script encerra com código 1 (erro).
*/
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_DATABASE_FILE_PATH'];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        console.error(`❌ Erro: A variável de ambiente ${varName} não está definida.`);
        process.exit(1);                 // Encerra o processo com código 1 para indicar falha.
    }
}

// Garante que o caminho do arquivo SQL seja absoluto, resolve a partir do diretório corrente.
const sqlFilePath = path.resolve(process.cwd(), DB_DATABASE_FILE_PATH);

// Configurações base de conexão usadas para construir as configurações admin e da aplicação.
const baseConfig = { host: DB_HOST, port: Number(DB_PORT), user: DB_USER };
/*
  adminConfig:
    - Conecta ao banco "admin" (normalmente 'postgres') para operações privilegiadas
      como terminar conexões e recriar o banco de dados.
    - Usa DB_ADMIN_PASSWORD se fornecido; caso contrário, usa DB_PASSWORD.
*/
const adminConfig = { ...baseConfig, database: DB_ADMIN_DATABASE, password: DB_ADMIN_PASSWORD || DB_PASSWORD };

/*
  appConfig:
    - Configuração usada para conectar ao banco de dados de aplicação (DB_DATABASE)
      após ele ter sido recriado, para aplicar o schema (arquivo SQL).
*/
const appConfig = { ...baseConfig, database: DB_DATABASE, password: DB_PASSWORD };

/*
  Função que recria (reset) o banco de dados alvo.
  Fluxo:
    1. Conecta como administrador.
    2. Finaliza (terminate) conexões ativas com o banco alvo para permitir DROP DATABASE.
    3. Executa DROP DATABASE IF EXISTS e CREATE DATABASE.
    4. Fecha a conexão admin no finally.
*/
async function resetDatabase() {
    const adminClient = new Client(adminConfig);
    try {
        await adminClient.connect();
        console.log(`- Conectado como admin ao banco "${DB_ADMIN_DATABASE}".`);
        console.log(`- Derrubando conexões existentes com "${DB_DATABASE}"...`);
        // Envia comando para finalizar outras conexões no banco alvo (exceto esta).
        await adminClient.query(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [DB_DATABASE]
        );
        console.log(`- Recriando o banco de dados "${DB_DATABASE}"...`);
        const dropQuery = `DROP DATABASE IF EXISTS ${DB_DATABASE}`;
        const createQuery = `CREATE DATABASE ${DB_DATABASE}`;
        // Executa DROP e CREATE do banco.
        await adminClient.query(dropQuery);
        await adminClient.query(createQuery);
        console.log(`- Banco de dados recriado com sucesso.`);
    } finally {
        // Garantimos que a conexão admin será encerrada mesmo em caso de erro acima.
        await adminClient.end();
        console.log('- Conexão de admin encerrada.');
    }
}

/*
  Função que aplica o schema (arquivo SQL) no banco de aplicação recém-criado.
  Fluxo:
    1. Lê o arquivo SQL do disco.
    2. Conecta ao banco de aplicação.
    3. Executa todo o SQL lido (pode conter várias instruções: CREATE TABLE, INSERT, etc).
    4. Fecha a conexão da aplicação no finally.
*/
async function applySchema() {
    let sql;
    try {
        console.log(`- Lendo SQL do arquivo: ${sqlFilePath}`);
        sql = await fs.readFile(sqlFilePath, 'utf8'); // Lê o arquivo como string.
    } catch (error) {
        // Se o arquivo SQL não existir ou não puder ser lido, lançamos erro (fatal para o script).
        console.error(`❌ Erro fatal: Não foi possível ler o arquivo de schema em ${sqlFilePath}.`);
        throw error;
    }
    const appClient = new Client(appConfig);
    try {
        await appClient.connect();
        console.log(`- Conectado ao banco "${DB_DATABASE}" para aplicar o schema.`);
        await appClient.query(sql); // Executa todas as instruções SQL do arquivo.
        console.log('- Schema SQL aplicado com sucesso.');
    } finally {
        // Fecha a conexão da aplicação sempre (sucesso ou erro).
        await appClient.end();
        console.log('- Conexão da aplicação encerrada.');
    }
}

/*
  Bloco principal de execução:
  - Informa início
  - Executa resetDatabase() e applySchema() sequencialmente
  - Em caso de erro, registra mensagem e termina o processo com código 1
*/
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
