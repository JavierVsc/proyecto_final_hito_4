import { Router } from 'express';
import { body } from 'express-validator';
import { asyncRoute, badRequest, notFound, positiveId } from '../lib/http.js';
import { withTransaction } from '../lib/transaction.js';
import { verifyToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

export function cartRoutes() {
  const router = Router();
  router.use(verifyToken);

  router.get('/', asyncRoute(async (req, res) => {
    const result = await req.app.locals.db.query(
      `SELECT ci.product_id, p.name, ci.quantity, p.price_clp AS unit_price_clp
       FROM carts c JOIN cart_items ci ON ci.cart_id = c.id
       JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = $1 ORDER BY ci.product_id`, [req.user.id]
    );
    const items = result.rows.map(row => ({ ...row, unit_price_clp: Number(row.unit_price_clp) }));
    const total_clp = items.reduce((sum, item) => sum + item.unit_price_clp * item.quantity, 0);
    res.json({ items, total_clp });
  }));

  router.post('/items', [
    body('product_id').isInt({ min: 1 }).withMessage('Producto inválido').toInt(),
    body('quantity').isInt({ min: 1, max: 1000 }).withMessage('Cantidad inválida').toInt(),
    validate,
  ], asyncRoute(async (req, res) => {
    const { product_id, quantity } = req.body;
    const result = await withTransaction(req.app.locals.db, async db => {
      const found = await db.query('SELECT stock FROM products WHERE id = $1 AND is_active = true FOR UPDATE', [product_id]);
      if (!found.rows[0]) throw notFound('Producto no encontrado');
      const cart = await db.query(
        'INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id',
        [req.user.id]
      );
      const current = await db.query('SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cart.rows[0].id, product_id]
      );
      const newQuantity = (current.rows[0]?.quantity || 0) + quantity;
      if (newQuantity > found.rows[0].stock) throw badRequest('Stock insuficiente');
      await db.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [cart.rows[0].id, product_id, newQuantity]
      );
      return newQuantity;
    });
    res.status(201).json({ product_id, quantity: result, message: 'Añadido al carrito' });
  }));

  router.patch('/items/:productId', [
    body('quantity').isInt({ min: 1, max: 1000 }).withMessage('Cantidad inválida').toInt(), validate,
  ], asyncRoute(async (req, res) => {
    const productId = positiveId(req.params.productId);
    const quantity = req.body.quantity;
    const result = await withTransaction(req.app.locals.db, async db => {
      const stock = await db.query('SELECT stock FROM products WHERE id = $1 AND is_active = true FOR UPDATE', [productId]);
      if (!stock.rows[0]) throw notFound('Producto no encontrado');
      if (quantity > stock.rows[0].stock) throw badRequest('Stock insuficiente');
      const updated = await db.query(
        `UPDATE cart_items ci SET quantity = $1
         FROM carts c WHERE ci.cart_id = c.id AND c.user_id = $2 AND ci.product_id = $3
         RETURNING ci.product_id`, [quantity, req.user.id, productId]
      );
      if (!updated.rows[0]) throw notFound('Producto no encontrado en el carrito');
      return updated.rows[0];
    });
    res.json({ product_id: result.product_id, quantity });
  }));

  router.delete('/items/:productId', asyncRoute(async (req, res) => {
    await req.app.locals.db.query(
      `DELETE FROM cart_items ci USING carts c
       WHERE ci.cart_id = c.id AND c.user_id = $1 AND ci.product_id = $2`,
      [req.user.id, positiveId(req.params.productId)]
    );
    res.status(204).end();
  }));
  return router;
}
