import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME?.trim() || 'Administración NEXBYTE';

try {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL inválido');
  if (!password || password.length < 12 || password.length > 72) {
    throw new Error('ADMIN_PASSWORD debe tener entre 12 y 72 caracteres');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const found = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (found.rows[0]) throw new Error('El correo ya pertenece a un usuario existente');
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin') RETURNING id, email, role`,
    [fullName, email, passwordHash]
  );
  console.log(`Administrador creado: ${result.rows[0].email} (id ${result.rows[0].id})`);
} catch (error) {
  console.error('No fue posible crear el administrador:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
