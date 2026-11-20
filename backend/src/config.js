import 'dotenv/config';

export function environment() {
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,https://nexbyte-hito-2.onrender.com')
    .split(',').map(origin => origin.trim()).filter(Boolean);
  return {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || '',
    origins,
  };
}

export function assertServerConfig() {
  const { jwtSecret, port } = environment();
  if (jwtSecret.length < 32 || jwtSecret.startsWith('REEMPLAZAR_')) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres aleatorios.');
  }
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT no es un puerto válido.');
  }
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    throw new Error('Debe configurarse DATABASE_URL o las variables PGHOST/PGUSER/PGDATABASE.');
  }
}
