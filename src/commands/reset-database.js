// src/commands/reset-database.js (ESM)

// 'use strict'; é uma diretiva que ativa um modo mais rigoroso do JavaScript,
// ajudando a evitar erros comuns e a escrever um código mais seguro.
'use strict';

// --- IMPORTAÇÕES DE MÓDULOS ---
// Cada 'import' traz funcionalidades de outras bibliotecas para este arquivo.

// O 'Client' é a classe principal da biblioteca 'pg' para se conectar ao PostgreSQL.
import { Client } from 'pg';

// 'fs/promises' é o módulo nativo do Node.js para interagir com o sistema de arquivos
// (ler, escrever, etc.), usando a sintaxe moderna de async/await (Promises).
import fs from 'fs/promises';

// O módulo 'path' fornece ferramentas para trabalhar com caminhos de arquivos e diretórios
// de uma forma que funciona em qualquer sistema operacional (Windows, Mac, Linux).
import path from 'path';

// Estas duas funções do módulo 'url' são necessárias para obter o caminho do diretório
// do script atual no modo ES Modules (o modo de 'import'/'export').
import { fileURLToPath } from 'url';

// A biblioteca 'dotenv' carrega variáveis de ambiente de um arquivo chamado '.env'
// para o objeto 'process.env' do Node.js. É ótimo para gerenciar senhas e configurações.
import dotenv from 'dotenv';


// --- 1. CONFIGURAÇÃO ---

// Executa a função da biblioteca dotenv para carregar as variáveis do arquivo .env.
dotenv.config();

// Aqui, usamos "desestruturação" para extrair as variáveis de 'process.env' para constantes locais.
// Isso torna o código mais limpo e fácil de ler.
const {
    // A sintaxe "DB_HOST: dbHost" renomeia a variável para seguir o padrão camelCase,
    // que é a convenção em JavaScript para nomes de variáveis.

    // --- Conexão Principal com o Banco ---
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_USER: dbUser,
    DB_PASSWORD: dbPassword,
    DB_DATABASE: dbName,

    // --- Conexão Administrativa (para reset) ---
    // Aqui definimos um valor padrão ('postgres'). Se PG_DATABASE_ADMIN não estiver no .env,
    // 'postgres' será usado. É uma boa prática para tornar o script mais robusto.
    PG_DATABASE_ADMIN: dbAdminName = 'postgres',
    DB_DATABASE_ADMIN_PASSWORD: dbAdminPassword,

    // --- Caminho do Arquivo de Schema ---
    DB_DATABASE_FILE_PATH: dbSchemaFilePath,

} = process.env;

// --- Resolução do Caminho do Arquivo .sql ---

// Esta é a maneira padrão e moderna de obter o caminho do diretório do arquivo em execução.
// Explicado em detalhe no início da resposta.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Esta constante guardará o caminho absoluto e final para o nosso arquivo 'banco.sql'.
// Usamos um operador ternário (if/else de uma linha) para decidir qual caminho usar.
const sqlFilePath = dbSchemaFilePath
    // CONDIÇÃO VERDADEIRA: Se 'dbSchemaFilePath' foi definido no .env...
    ? path.resolve(process.cwd(), dbSchemaFilePath)
    // CONDIÇÃO FALSA: Se não, usamos um caminho padrão relativo ao local deste script.
    : path.resolve(__dirname, '../database', 'banco.sql');


// --- 2. LÓGICA PRINCIPAL ---

// Criamos uma função 'async' para podermos usar 'await'. Isso torna o código
// que lida com operações demoradas (como I/O de rede ou disco) muito mais legível.
async function main() {
    // Criamos um objeto de configuração base para evitar repetição (Princípio DRY).
    // Todas as nossas conexões usarão essas mesmas configurações básicas.
    const baseConfig = {
        host: dbHost,
        port: Number(dbPort), // A porta vem como string, convertemos para número.
        user: dbUser,
    };

    // Declaramos as variáveis dos clientes aqui fora do bloco 'try' para que
    // elas sejam acessíveis no bloco 'finally' e possamos garantir que sejam fechadas.
    let adminClient, appClient;

    // O bloco 'try...catch...finally' é para tratamento de erros.
    // O código dentro do 'try' é executado. Se um erro ocorrer, o 'catch' é acionado.
    // O 'finally' é executado SEMPRE ao final, com ou sem erro.
    try {
        // --- ETAPA 1: Conectar como admin para apagar e recriar o banco ---

        // Criamos uma nova instância do cliente para a conexão administrativa.
        // Usamos o 'spread operator' (...) para copiar as propriedades de 'baseConfig'
        // e depois adicionamos ou sobrescrevemos as que são específicas para esta conexão.
        adminClient = new Client({
            ...baseConfig,
            database: dbAdminName,
            // Lógica inteligente: usa a senha de admin se ela existir, senão, usa a senha padrão.
            password: dbAdminPassword || dbPassword,
        });
        // 'await' pausa a execução da função até que a conexão seja estabelecida.
        await adminClient.connect();

        console.log(`- Recriando o banco de dados "${dbName}"...`);
        // 'escapeIdentifier' é uma função de segurança da biblioteca 'pg' que protege
        // contra SQL Injection em nomes de tabelas, bancos, etc.
        const safeDbName = adminClient.escapeIdentifier(dbName);

        // Encerra todas as outras conexões ativas no banco de dados alvo para evitar erros de "banco em uso".
        await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [dbName]);
        // Apaga o banco de dados se ele existir.
        await adminClient.query(`DROP DATABASE IF EXISTS ${safeDbName}`);
        // Cria o banco de dados novamente, limpo.
        await adminClient.query(`CREATE DATABASE ${safeDbName}`);
        console.log(`- Banco de dados recriado com sucesso.`);

        // É uma boa prática fechar a conexão assim que ela não for mais necessária.
        await adminClient.end();

        // --- ETAPA 2: Conectar ao novo banco para aplicar o schema ---
        console.log(`- Aplicando SQL do arquivo: ${sqlFilePath}`);
        // Lê todo o conteúdo do arquivo .sql como texto.
        const sql = await fs.readFile(sqlFilePath, 'utf8');
        // Cria um novo cliente, desta vez para se conectar ao banco recém-criado.
        appClient = new Client({ ...baseConfig, database: dbName, password: dbPassword });
        await appClient.connect();
        // Executa todo o conteúdo do arquivo .sql de uma vez.
        await appClient.query(sql);
        console.log(`- SQL aplicado com sucesso.`);

    } catch (error) {
        // Se um erro ocorrer, este bloco é executado.
        // Verificamos se o erro é 'ENOENT' (Error NO ENTry), que significa "Arquivo não encontrado".
        if (error.code === 'ENOENT') {
            // Se o arquivo .sql não foi encontrado, isso não é um erro fatal.
            // O banco foi recriado, então avisamos o usuário e continuamos.
            console.warn(`⚠️ AVISO: O banco foi recriado, mas o arquivo de schema não foi encontrado.`);
            // 'return' encerra a função 'main' aqui.
            return;
        }
        // Se for qualquer outro tipo de erro (ex: falha de conexão, SQL inválido),
        // nós o "lançamos" para ser capturado pelo bloco 'catch' principal na seção de execução.
        throw error;
    } finally {
        // Este bloco é crucial! Ele garante que, não importa o que aconteça (sucesso ou erro),
        // as conexões com o banco de dados sejam fechadas para não deixar processos "pendurados".
        if (adminClient) await adminClient.end();
        if (appClient) await appClient.end();
    }
}


// --- 3. EXECUÇÃO ---

// Esta é uma "Immediately Invoked Function Expression" (IIFE) assíncrona.
// É um padrão comum para executar código 'async' no nível principal de um arquivo.
(async () => {
    try {
        // Chama nossa função principal e espera ela terminar.
        await main();
        console.log('✅ Processo de reset finalizado com sucesso.');
    } catch (error) {
        // Se a função 'main' lançar um erro que não foi tratado internamente,
        // este 'catch' irá pegá-lo.
        console.error('❌ ERRO FATAL: Não foi possível resetar o banco de dados.');
        console.error(error); // Mostra o objeto de erro completo para depuração.
        // 'process.exit(1)' encerra o programa com um código de erro, indicando que algo deu errado.
        process.exit(1);
    }
})();