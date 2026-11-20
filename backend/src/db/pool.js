import pg from 'pg';
import { environment } from '../config.js';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || undefined;
const pool = new Pool({
  ...(connectionString ? { connectionString } : {}),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 7000,
});

pool.on('error', error => {
  console.error('Error de conexión PostgreSQL:', error.message);
});

export { pool };
