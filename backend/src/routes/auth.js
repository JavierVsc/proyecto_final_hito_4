import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { asyncRoute, HttpError } from '../lib/http.js';
import { validate } from '../middlewares/validation.js';
import { signToken } from '../middlewares/auth.js';

const publicUser = ({ id, full_name, email, role }) => ({ id, full_name, email, role });

export function authRoutes() {
  const router = Router();

  router.post('/register', [
    body('full_name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Nombre inválido'),
    body('email').isEmail().withMessage('Correo inválido').normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 72 }).withMessage('Contraseña de 8 a 72 caracteres'),
    validate,
  ], asyncRoute(async (req, res) => {
    const { full_name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const result = await req.app.locals.db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer') RETURNING id, full_name, email, role`,
      [full_name, email, hash]
    );
    res.status(201).json({ user: publicUser(result.rows[0]) });
  }));

  router.post('/login', [
    body('email').isEmail().withMessage('Correo inválido').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Contraseña requerida'),
    validate,
  ], asyncRoute(async (req, res) => {
    const result = await req.app.locals.db.query(
      'SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1',
      [req.body.email]
    );
    const found = result.rows[0];
    const matches = found && await bcrypt.compare(req.body.password, found.password_hash);
    if (!matches) throw new HttpError(401, 'UNAUTHORIZED', 'Credenciales inválidas');
    const user = publicUser(found);
    res.json({ token: signToken(user), user });
  }));
  return router;
}
