import { Router } from 'express';
import { body } from 'express-validator';
import { asyncRoute, badRequest, notFound, positiveId } from '../lib/http.js';
import { withTransaction } from '../lib/transaction.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

const isHttpUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
};

const imagesRule = body('images').optional().isArray({ max: 10 }).withMessage('Máximo 10 URLs de imágenes')
  .bail().custom(images => images.every(img => typeof img === 'string' && img.length <= 2048 && isHttpUrl(img)))
  .withMessage('Las imágenes deben ser URLs HTTP o HTTPS');

const addRules = [
  body('category_id').isInt({ min: 1 }).withMessage('Categoría inválida').toInt(),
  body('name').isString().trim().isLength({ min: 2, max: 160 }).withMessage('Nombre inválido'),
  body('brand').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Marca inválida'),
  body('sku').isString().trim().isLength({ min: 2, max: 50 }).withMessage('SKU inválido'),
  body('description').optional().isString().isLength({ max: 5000 }).withMessage('Descripción inválida'),
  body('price_clp').isInt({ min: 0 }).withMessage('Precio inválido').toInt(),
  body('stock').isInt({ min: 0 }).withMessage('Stock inválido').toInt(),
  imagesRule, validate,
];

const editable = ['category_id', 'name', 'brand', 'sku', 'description', 'price_clp', 'stock', 'is_active'];

export function productRoutes() {
  const router = Router();

  router.get('/', asyncRoute(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 12);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw badRequest('page debe ser >= 1 y limit entre 1 y 100');
    }
    const category = String(req.query.category || '').trim();
    const search = String(req.query.q || '').trim();
    if (category.length > 100 || search.length > 150) throw badRequest('Filtro demasiado largo');
    const conditions = ['p.is_active = true'];
    const values = [];
    if (category) { values.push(category); conditions.push(`c.slug = $${values.length}`); }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${values.length} OR p.brand ILIKE $${values.length})`);
    }
    const where = conditions.join(' AND ');
    const db = req.app.locals.db;
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM products p JOIN categories c ON c.id = p.category_id WHERE ${where}`,
      values
    );
    const list = await db.query(
      `SELECT p.id, p.category_id, p.name, p.brand, p.price_clp, p.stock, p.description, p.created_at,
       (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image_url
       FROM products p JOIN categories c ON c.id = p.category_id WHERE ${where}
       ORDER BY p.created_at DESC, p.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit]
    );
    res.json({ data: list.rows, pagination: { page, limit, total: count.rows[0].total } });
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    const id = positiveId(req.params.id);
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM products WHERE id = $1 AND is_active = true', [id]);
    const product = result.rows[0];
    if (!product) throw notFound('Producto no encontrado');
    const images = await db.query(
      'SELECT id, image_url, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
      [id]
    );
    res.json({ ...product, images: images.rows });
  }));

  router.post('/', verifyToken, requireRole('admin'), addRules, asyncRoute(async (req, res) => {
    const { category_id, name, brand, sku, description = '', price_clp, stock, images = [] } = req.body;
    const result = await withTransaction(req.app.locals.db, async db => {
      const created = await db.query(
        `INSERT INTO products (category_id, name, brand, sku, description, price_clp, stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, category_id, name, brand, sku, description, price_clp, stock, is_active`,
        [category_id, name, brand, sku, description, price_clp, stock]
      );
      for (const [index, url] of images.entries()) {
        await db.query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)',
          [created.rows[0].id, url, index]);
      }
      return created.rows[0];
    });
    res.status(201).json(result);
  }));

  router.patch('/:id', verifyToken, requireRole('admin'), [
    body('category_id').optional().isInt({ min: 1 }).withMessage('Categoría inválida').toInt(),
    body('name').optional().isString().trim().isLength({ min: 2, max: 160 }).withMessage('Nombre inválido'),
    body('brand').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Marca inválida'),
    body('sku').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('SKU inválido'),
    body('description').optional().isString().isLength({ max: 5000 }).withMessage('Descripción inválida'),
    body('price_clp').optional().isInt({ min: 0 }).withMessage('Precio inválido').toInt(),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido').toInt(),
    body('is_active').optional().isBoolean().withMessage('is_active inválido').toBoolean(),
    imagesRule, validate,
  ], asyncRoute(async (req, res) => {
    const id = positiveId(req.params.id);
    const keys = Object.keys(req.body);
    if (!keys.length || keys.some(key => ![...editable, 'images'].includes(key))) {
      throw badRequest('Campos de producto no permitidos');
    }
    const result = await withTransaction(req.app.locals.db, async db => {
      const fields = editable.filter(field => Object.hasOwn(req.body, field));
      if (fields.length) {
        const values = fields.map(field => req.body[field]);
        values.push(id);
        const set = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
        await db.query(`UPDATE products SET ${set} WHERE id = $${values.length}`, values);
      }
      if (Object.hasOwn(req.body, 'images')) {
        await db.query('DELETE FROM product_images WHERE product_id = $1', [id]);
        for (const [index, url] of req.body.images.entries()) {
          await db.query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3)', [id, url, index]);
        }
      }
      const found = await db.query('SELECT id, name, price_clp, stock, is_active FROM products WHERE id = $1', [id]);
      if (!found.rows[0]) throw notFound('Producto no encontrado');
      return found.rows[0];
    });
    res.json(result);
  }));

  router.delete('/:id', verifyToken, requireRole('admin'), asyncRoute(async (req, res) => {
    const result = await req.app.locals.db.query(
      'UPDATE products SET is_active = false WHERE id = $1 AND is_active = true RETURNING id',
      [positiveId(req.params.id)]
    );
    if (!result.rows[0]) throw notFound('Producto no encontrado');
    res.status(204).end();
  }));

  return router;
}
