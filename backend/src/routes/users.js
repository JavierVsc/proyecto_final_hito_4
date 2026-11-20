import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { asyncRoute, badRequest } from '../lib/http.js';

export function userRoutes() {
  const router = Router();
  router.use(verifyToken);
  router.get('/me', (req, res) => res.json(req.user));
  router.patch('/me', [
    body('full_name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Nombre inválido'),
    validate,
  ], asyncRoute(async (req, res) => {
    if (Object.keys(req.body).some(key => key !== 'full_name')) {
      throw badRequest('Solo está permitido modificar full_name');
    }
    const result = await req.app.locals.db.query(
      'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, full_name, email, role',
      [req.body.full_name, req.user.id]
    );
    res.json(result.rows[0]);
  }));
  return router;
}
