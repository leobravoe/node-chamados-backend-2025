// scripts/reset-database.js
// -----------------------------------------------------------------------------
// O QUE ESTE ARQUIVO FAZ?
// -----------------------------------------------------------------------------
// Ele chama o programa de linha de comando do PostgreSQL chamado **psql**
// para executar um arquivo SQL (banco.sql) que **apaga e recria o banco**, além
// de criar tabelas e inserir dados de exemplo.
//
// Ele foi pensado para iniciantes, então:
// - usa Node.js para rodar um programa externo (psql);
// - lê variáveis do arquivo .env (por exemplo, usuário/senha do banco);
// - imprime mensagens claras no terminal;
// - força a leitura do arquivo SQL como UTF-8 (evita erros de acentuação no Windows).
//
// REQUISITOS PRÁTICOS
// - Ter o PostgreSQL instalado (o psql vem junto) OU informar o caminho do psql
//   no .env com a variável PSQL_PATH (ex.: C:\Program Files\PostgreSQL\17\bin\psql.exe).
// - Ter um arquivo src/database/banco.sql com os comandos SQL do seu projeto.
// -----------------------------------------------------------------------------
// IMPORTAÇÕES (bibliotecas internas do Node + dotenv)
// -----------------------------------------------------------------------------
// "execFileSync": executa um programa externo e ESPERA ele terminar (modo síncrono).
//   → usamos o "psql" como programa externo.
// "path": ajuda a montar caminhos de arquivo/pasta de forma segura (Windows/Linux/Mac).
// "fs": permite checar se um arquivo existe, ler/gravar etc.
// "dotenv": lê o arquivo .env e joga as variáveis para dentro de process.env.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
// Carrega as variáveis do .env (se não existir, tudo bem: usamos padrões).
// Exemplo de .env:
//   DB_HOST=localhost
//   DB_PORT=5432
//   DB_USER=postgres
//   DB_PASSWORD=postgres
//   PSQL_PATH="C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe"
dotenv.config();
// LENDO AS CONFIGURAÇÕES (com "planos B" caso falte algo no .env)
// -----------------------------------------------------------------------------
// process.env é um "objeto" com variáveis de ambiente do sistema/arquivo .env.
// A setinha "||" lê: "se não tiver o da esquerda, use o da direita".
const PSQL       = process.env.PSQL_PATH || 'psql';           // caminho do psql (ou só 'psql' se estiver no PATH do sistema)
const PGHOST     = process.env.DB_HOST  || process.env.PGHOST || 'localhost'; // endereço do servidor do Postgres
const PGPORT     = process.env.DB_PORT  || process.env.PGPORT || '5432';      // porta do Postgres
const PGUSER     = process.env.DB_USER  || process.env.PGUSER || 'postgres';  // usuário do Postgres
const PGPASSWORD = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres'; // senha do Postgres
// ONDE ESTÁ O ARQUIVO SQL QUE VAMOS EXECUTAR?
// -----------------------------------------------------------------------------
// path.resolve(...): monta um caminho absoluto a partir da pasta atual do projeto.
// process.cwd(): "current working directory" (a pasta onde você rodou o node).
// O arquivo usado aqui é "src/database/banco.sql".
const sqlFile = path.resolve(process.cwd(), 'src', 'database', 'banco.sql');
// CONFERÊNCIA IMPORTANTE
// -----------------------------------------------------------------------------
// Se o arquivo não existir, não adianta continuar: avisamos e saímos do programa.
if (!fs.existsSync(sqlFile)) {
  console.error('❌ Arquivo SQL não encontrado em:', sqlFile);
  process.exit(1); // 1 = deu erro (por convenção)
}
// MONTANDO A LINHA DE COMANDO DO PSQL (EM PARTES)
// -----------------------------------------------------------------------------
// Abaixo montamos um array "args" que representa os argumentos que passaríamos
// no terminal. É como se executássemos:
//
//   psql --no-psqlrc -v ON_ERROR_STOP=1 -h <host> -p <porta> -U <user> -d postgres -f <arquivo.sql>
//
// Explicando cada um:
// --no-psqlrc         → ignora configurações do arquivo .psqlrc (evita mudanças inesperadas, como encoding)
// -v ON_ERROR_STOP=1  → se der qualquer erro SQL, pare imediatamente
// -h, -p, -U          → host, porta e usuário do Postgres (igual no terminal)
// -d postgres         → conecta no banco "postgres" (seu banco SQL pode criar outro e conectar nele)
// -f arquivo.sql      → caminho do arquivo SQL a ser executado
const args = [
  '--no-psqlrc',
  '-v', 'ON_ERROR_STOP=1',
  '-h', PGHOST,
  '-p', PGPORT,
  '-U', PGUSER,
  '-d', 'postgres',
  '-f', sqlFile
];
try {
  // MENSAGENS AMIGÁVEIS ANTES DE RODAR
  // ---------------------------------------------------------------------------
  console.log('> Executando reset do banco...');
  console.log(`  psql: ${PSQL}`);
  console.log(`  conexão: host=${PGHOST} port=${PGPORT} user=${PGUSER}`);
  console.log(`  arquivo: ${sqlFile}`);
  // AGORA VEM A "MAGIA": CHAMANDO O PSQL
  // ---------------------------------------------------------------------------
  // execFileSync(programa, argumentos, opções)
  // - "programa"  → aqui é o psql (ex.: 'psql' ou 'C:\\...\\psql.exe')
  // - "argumentos" → o array "args" detalhado acima
  // - "opções":
  //     stdio: 'inherit'
  //       → tudo o que o psql escrever (logs/erros) aparece no SEU terminal.
  //         (sem isso, você não veria a saída do psql em tempo real)
  //
  //     env: { ...process.env, PGPASSWORD, PGCLIENTENCODING: 'UTF8' }
  //       → enviamos para o processo do psql todas as variáveis que você já tem
  //         (process.env) + PGPASSWORD (para não pedir senha interativa)
  //         + PGCLIENTENCODING='UTF8' (dica valiosa no Windows: força o psql a
  //           ler o arquivo como UTF-8, evitando erros de acentos).
  execFileSync(PSQL, args, {
    stdio: 'inherit',
    env: {
      ...process.env,          // mantém suas variáveis de ambiente atuais
      PGPASSWORD,              // senha do Postgres (evita prompt interativo)
      PGCLIENTENCODING: 'UTF8' // força o psql a interpretar ENTRADA como UTF-8 (útil no Windows)
    }
  });
  // Se chegamos aqui, o psql terminou sem erros (graças ao ON_ERROR_STOP=1).
  console.log('> ✅ Reset finalizado com sucesso.');
} catch (err) {
  // TRATAMENTO DE ERROS
  // ---------------------------------------------------------------------------
  // err.code === 'ENOENT' → o Node não encontrou o programa "psql".
  // Isso acontece quando o psql não está instalado ou não está no PATH do sistema.
  if (err.code === 'ENOENT') {
    console.error('❌ psql não encontrado.');
    console.error('   O que fazer:');
    console.error('   1) Instale o PostgreSQL e garanta que o "psql" está no PATH;');
    console.error('   2) OU defina PSQL_PATH no .env com o caminho completo do psql.exe;');
  } else {
    // Qualquer outro erro: senha errada, host/porta inválidos, SQL com erro etc.
    // err.message mostra a mensagem que o Node recebeu do psql.
    console.error('❌ Falha ao executar o reset:', err.message);
  }
  // Encerra o script com código de erro (1).
  process.exit(1);
}
