import { Router } from 'express';
import { asyncRoute } from '../lib/http.js';

export function categoryRoutes() {
  const router = Router();
  router.get('/', asyncRoute(async (req, res) => {
    const result = await req.app.locals.db.query('SELECT id, name, slug FROM categories ORDER BY id');
    res.json({ data: result.rows });
  }));
  return router;
}
