import { Router } from 'express';
import { body } from 'express-validator';
import { asyncRoute, badRequest, forbidden, notFound, positiveId } from '../lib/http.js';
import { withTransaction } from '../lib/transaction.js';
import { verifyToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

export function orderRoutes() {
  const router = Router();
  router.use(verifyToken);

  router.post('/', [
    body('items').isArray({ min: 1, max: 50 }).withMessage('Lista de productos inválida'),
    body('items.*.product_id').isInt({ min: 1 }).withMessage('Producto inválido').toInt(),
    body('items.*.quantity').isInt({ min: 1, max: 1000 }).withMessage('Cantidad inválida').toInt(),
    validate,
  ], asyncRoute(async (req, res) => {
    const requested = new Map();
    for (const item of req.body.items) {
      const next = (requested.get(item.product_id) || 0) + item.quantity;
      if (next > 1000) throw badRequest('Cantidad máxima superada');
      requested.set(item.product_id, next);
    }
    const ids = [...requested.keys()].sort((a, b) => a - b);
    const result = await withTransaction(req.app.locals.db, async db => {
      const productsResult = await db.query(
        `SELECT id, name, price_clp, stock FROM products
         WHERE id = ANY($1::int[]) AND is_active = true ORDER BY id FOR UPDATE`, [ids]
      );
      if (productsResult.rows.length !== ids.length) throw notFound('Uno o más productos no están disponibles');
      const products = productsResult.rows;
      for (const product of products) {
        if (requested.get(product.id) > product.stock) throw badRequest(`Stock insuficiente: ${product.name}`);
      }
      const total = products.reduce((sum, product) => sum + Number(product.price_clp) * requested.get(product.id), 0);
      if (!Number.isSafeInteger(total)) throw badRequest('Total de pedido inválido');
      const order = await db.query(
        `INSERT INTO orders (user_id, status, total_clp) VALUES ($1, 'pendiente', $2)
         RETURNING id, status, total_clp`, [req.user.id, total]
      );
      const items = [];
      for (const product of products) {
        const quantity = requested.get(product.id);
        await db.query(
          `INSERT INTO order_items (order_id, product_id, product_name_snapshot, unit_price_clp, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.rows[0].id, product.id, product.name, product.price_clp, quantity]
        );
        await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
        items.push({ product_id: product.id, quantity, unit_price_clp: Number(product.price_clp) });
      }
      return { id: order.rows[0].id, status: order.rows[0].status, total_clp: total, items };
    });
    res.status(201).json(result);
  }));

  router.get('/', asyncRoute(async (req, res) => {
    const rows = await req.app.locals.db.query(
      'SELECT id, status, total_clp, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [req.user.id]
    );
    res.json({ data: rows.rows.map(row => ({ ...row, total_clp: Number(row.total_clp) })) });
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    const db = req.app.locals.db;
    const orderId = positiveId(req.params.id);
    const found = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!found.rows[0]) throw notFound('Pedido no encontrado');
    if (found.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      throw forbidden('No puede acceder a los pedidos de otra cuenta');
    }
    const items = await db.query(
      'SELECT product_id, product_name_snapshot, unit_price_clp, quantity FROM order_items WHERE order_id = $1 ORDER BY id',
      [orderId]
    );
    res.json({ ...found.rows[0], total_clp: Number(found.rows[0].total_clp), items: items.rows });
  }));
  return router;
}
