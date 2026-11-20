import { Router } from 'express';
import { body } from 'express-validator';
import { asyncRoute, notFound, positiveId } from '../lib/http.js';
import { verifyToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

export function favoriteRoutes() {
  const router = Router();
  router.use(verifyToken);

  router.get('/', asyncRoute(async (req, res) => {
    const result = await req.app.locals.db.query(
      `SELECT f.product_id, p.name, p.price_clp FROM favorites f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = $1 AND p.is_active = true
       ORDER BY f.created_at DESC`, [req.user.id]
    );
    res.json({ data: result.rows });
  }));

  router.post('/', [body('product_id').isInt({ min: 1 }).withMessage('Producto inválido').toInt(), validate],
    asyncRoute(async (req, res) => {
      const db = req.app.locals.db;
      const id = req.body.product_id;
      const found = await db.query('SELECT id FROM products WHERE id = $1 AND is_active = true', [id]);
      if (!found.rows[0]) throw notFound('Producto no encontrado');
      await db.query(
        'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, id]
      );
      res.status(201).json({ product_id: id, message: 'Añadido a favoritos' });
    })
  );

  router.delete('/:productId', asyncRoute(async (req, res) => {
    await req.app.locals.db.query('DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
      [req.user.id, positiveId(req.params.productId)]);
    res.status(204).end();
  }));

  return router;
}
