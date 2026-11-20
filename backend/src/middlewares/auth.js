import jwt from 'jsonwebtoken';
import { environment } from '../config.js';
import { asyncRoute, forbidden, HttpError } from '../lib/http.js';

const tokenOptions = { algorithm: 'HS256', issuer: 'nexbyte-api', audience: 'nexbyte-client', expiresIn: '2h' };

export function signToken(user) {
  return jwt.sign({ role: user.role }, environment().jwtSecret, { ...tokenOptions, subject: String(user.id) });
}

export const verifyToken = asyncRoute(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw new HttpError(401, 'UNAUTHORIZED', 'Falta el token de autenticación');
  let payload;
  try {
    payload = jwt.verify(match[1], environment().jwtSecret, {
      algorithms: ['HS256'], issuer: tokenOptions.issuer, audience: tokenOptions.audience,
    });
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Token inválido o vencido');
  }
  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Token inválido');
  }
  const result = await req.app.locals.db.query(
    'SELECT id, full_name, email, role FROM users WHERE id = $1', [id]
  );
  if (!result.rows[0]) throw new HttpError(401, 'UNAUTHORIZED', 'Usuario no disponible');
  req.user = result.rows[0];
  next();
});

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return next(forbidden('Se requiere un perfil de administración'));
    next();
  };
}
