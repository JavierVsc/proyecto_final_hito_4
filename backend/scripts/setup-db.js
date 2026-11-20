import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

try {
  const path = fileURLToPath(new URL('../db/schema.sql', import.meta.url));
  await pool.query(await readFile(path, 'utf8'));
  console.log('Esquema de NEXBYTE creado o comprobado correctamente.');
} catch (error) {
  console.error('Error al crear el esquema:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
