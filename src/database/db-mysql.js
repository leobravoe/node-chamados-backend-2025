// src/database/db.js (MariaDB / MySQL com mysql2)
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // equivalentes úteis ao Pool do pg
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export { pool };