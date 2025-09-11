// db.js
// -----------------------------------------------------------------------------
// O QUE ESTE ARQUIVO FAZ?
// -----------------------------------------------------------------------------
// Cria e exporta um "pool" de conexões com o PostgreSQL usando a biblioteca
// "pg" (node-postgres). O "pool" é um gerenciador de conexões que:
//   • mantém um pequeno conjunto de conexões abertas e as reutiliza;
//   • evita abrir/fechar conexão a cada consulta (fica mais rápido e estável);
//   • permite chamar pool.query(...) de qualquer parte do seu backend.
//
// De onde vêm host/porta/usuário/senha?
//   • Lemos de variáveis de ambiente (process.env), que geralmente vêm do arquivo
//     .env (carregado pelo dotenv) ou do ambiente do sistema no deploy.
// Em resumo: este arquivo centraliza a configuração de acesso ao banco.
// -----------------------------------------------------------------------------
// 1) Importa, da biblioteca "pg", a classe Pool (o "orquestrador" de conexões).
//    • A sintaxe { Pool } é um "import nomeado" do ES Modules.
//    • A lib "pg" precisa estar instalada: npm i pg
import { Pool } from "pg";
// 2) Importa o dotenv, que lê o arquivo .env e coloca as chaves/valores dentro
//    de process.env. Isso permite acessar credenciais sem colocá-las no código.
import dotenv from "dotenv";
// 3) Executa a leitura do .env.
//    • Se o arquivo .env não existir, não tem problema: as variáveis podem vir
//      do próprio ambiente do SO (ex.: variáveis configuradas no provedor).
dotenv.config();
// 4) Monta as variáveis de configuração do banco.
//    • A lib "pg" aceita porta como string, então não precisamos converter.
//    • Usamos "fallbacks": tentamos primeiro as variáveis PG* (padrão Postgres),
//      depois DB_* (mais amigáveis para iniciantes) e, por fim, valores padrão.
//    • Isso torna o arquivo flexível para diferentes setups (.envs) sem mudar código.
const HOST = process.env.PGHOST || process.env.DB_HOST || "localhost";
const PORT = process.env.PGPORT || process.env.DB_PORT || "5432"; // pode ser string
const DATABASE = process.env.PGDATABASE || process.env.DB_DATABASE || "chamados_api_db";
const USER = process.env.PGUSER || process.env.DB_USER || "postgres";
const PASSWORD = process.env.PGPASSWORD || process.env.DB_PASSWORD || "postgres";
// 5) Cria o "pool" de conexões com as credenciais definidas acima.
//    • Esse pool mantém conexões abertas e distribui para cada query.
//    • Em provedores gerenciados, às vezes é necessário habilitar SSL.
//      Se for o caso, descomente o campo ssl abaixo e ajuste conforme a doc do provedor.
const pool = new Pool({
  host: HOST,         // endereço do servidor Postgres (ex.: "localhost")
  port: PORT,         // porta do Postgres (padrão "5432")
  database: DATABASE, // nome do banco (ex.: "chamados_api_db")
  user: USER,         // usuário do banco (ex.: "postgres")
  password: PASSWORD, // senha do usuário
  // ssl: { rejectUnauthorized: false }, // alguns provedores exigem SSL; ajuste conforme necessário
});
// 6) Exporta o pool como **export nomeado**.
//    • IMPORTANTE: aqui usamos "export { pool };" (não é export default).
//    • Para importar em outro arquivo, use:
//        import { pool } from "./db.js"
//      (repare nas chaves — é um import nomeado).
//    • Se você tentasse "import db from './db.js'", **não** funcionaria aqui,
//      porque não existe export default neste arquivo.
export { pool };
