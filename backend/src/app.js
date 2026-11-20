import express from 'express';
import cors from 'cors';
import { environment } from './config.js';
import { pool } from './db/pool.js';
import { asyncRoute, HttpError } from './lib/http.js';
import { notFoundHandler, errorHandler } from './middlewares/errors.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { categoryRoutes } from './routes/categories.js';
import { productRoutes } from './routes/products.js';
import { favoriteRoutes } from './routes/favorites.js';
import { cartRoutes } from './routes/cart.js';
import { orderRoutes } from './routes/orders.js';

export function createApp({ db = pool } = {}) {
  const app = express();
  const origins = environment().origins;
  app.locals.db = db;
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new HttpError(403, 'CORS_DENIED', 'Origen no permitido'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', app: 'NEXBYTE API' }));
  app.get('/api/v1/health/db', asyncRoute(async (req, res) => {
    await req.app.locals.db.query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  }));
  app.use('/api/v1/auth', authRoutes());
  app.use('/api/v1/users', userRoutes());
  app.use('/api/v1/categories', categoryRoutes());
  app.use('/api/v1/products', productRoutes());
  app.use('/api/v1/favorites', favoriteRoutes());
  app.use('/api/v1/cart', cartRoutes());
  app.use('/api/v1/orders', orderRoutes());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
