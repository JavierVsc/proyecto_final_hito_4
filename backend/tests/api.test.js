import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.JWT_SECRET = 'nexbyte_test_secret_only_not_for_production_123456789';
process.env.CORS_ORIGINS = 'http://localhost:5173,https://nexbyte-hito-2.onrender.com';
const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/middlewares/auth.js');

const hash = bcrypt.hashSync('ClavePrueba123', 4);
const customer = { id: 7, full_name: 'Cliente Prueba', email: 'cliente@prueba.cl', role: 'customer' };
const admin = { id: 1, full_name: 'Administración NEXBYTE', email: 'admin@nexbyte.cl', role: 'admin' };
const sampleProduct = { id: 42, category_id: 1, name: 'Notebook de prueba', brand: 'NEXBYTE', price_clp: 499990, stock: 4, is_active: true };

function fakeDatabase() {
  const calls = [];
  const db = {
    calls,
    async query(sql, args = []) {
      calls.push({ sql, args });
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [] };
      if (/SELECT 1 AS ok/.test(sql)) return { rows: [{ ok: 1 }] };
      if (/FROM categories ORDER BY id/.test(sql)) return { rows: [{ id: 1, name: 'Notebooks', slug: 'notebooks' }] };
      if (/COUNT\(\*\)::int AS total FROM products/.test(sql)) return { rows: [{ total: 1 }] };
      if (/SELECT p\.id, p\.category_id, p\.name/.test(sql)) return { rows: [{ ...sampleProduct, image_url: null }] };
      if (/SELECT \* FROM products WHERE id = \$1/.test(sql)) return { rows: args[0] === 42 ? [sampleProduct] : [] };
      if (/FROM product_images WHERE product_id/.test(sql)) return { rows: [] };
      if (/SELECT id, full_name, email, role, password_hash FROM users WHERE email/.test(sql)) {
        return { rows: args[0] === customer.email ? [{ ...customer, password_hash: hash }] : [] };
      }
      if (/INSERT INTO users \(/.test(sql)) return { rows: [{ ...customer, email: args[1], full_name: args[0] }] };
      if (/SELECT id, full_name, email, role FROM users WHERE id/.test(sql)) {
        return { rows: args[0] === 1 ? [admin] : args[0] === 7 ? [customer] : [] };
      }
      if (/INSERT INTO products \(/.test(sql)) return { rows: [sampleProduct] };
      if (/INSERT INTO product_images \(/.test(sql)) return { rows: [] };
      throw new Error(`Consulta no implementada en doble de prueba: ${sql.slice(0, 110)}`);
    },
    async connect() { return { query: (sql, args) => db.query(sql, args), release() {} }; },
  };
  return db;
}

const app = () => createApp({ db: fakeDatabase() });

test('GET /api/v1/health responde 200', async () => {
  const response = await request(app()).get('/api/v1/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('GET /api/v1/health/db consulta la base PostgreSQL', async () => {
  const db = fakeDatabase();
  const response = await request(createApp({ db })).get('/api/v1/health/db');
  assert.equal(response.status, 200);
  assert.ok(db.calls.some(call => call.sql.includes('SELECT 1 AS ok')));
});

test('GET /api/v1/categories devuelve datos 200', async () => {
  const response = await request(app()).get('/api/v1/categories');
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].slug, 'notebooks');
});

test('GET /api/v1/products devuelve catálogo y paginación 200', async () => {
  const response = await request(app()).get('/api/v1/products?page=1&limit=12');
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].id, 42);
  assert.equal(response.body.pagination.total, 1);
});

test('GET /api/v1/products/999 devuelve 404', async () => {
  const response = await request(app()).get('/api/v1/products/999');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('POST /api/v1/auth/register valida campos y responde 400', async () => {
  const response = await request(app()).post('/api/v1/auth/register')
    .send({ full_name: 'X', email: 'invalido', password: '123' });
  assert.equal(response.status, 400);
});

test('POST /api/v1/auth/register crea un cliente sin rol admin y responde 201', async () => {
  const response = await request(app()).post('/api/v1/auth/register')
    .send({ full_name: 'Cliente Prueba', email: 'cliente@prueba.cl', password: 'ClavePrueba123', role: 'admin' });
  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, 'customer');
  assert.equal(response.body.user.password_hash, undefined);
});

test('POST /api/v1/auth/login comprueba credenciales y responde 200 + JWT', async () => {
  const response = await request(app()).post('/api/v1/auth/login')
    .send({ email: customer.email, password: 'ClavePrueba123' });
  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, customer.email);
});

test('POST /api/v1/auth/login rechaza clave incorrecta con 401', async () => {
  const response = await request(app()).post('/api/v1/auth/login')
    .send({ email: customer.email, password: 'ClaveIncorrecta999' });
  assert.equal(response.status, 401);
});

test('GET /api/v1/users/me exige token y responde 401 si falta', async () => {
  const response = await request(app()).get('/api/v1/users/me');
  assert.equal(response.status, 401);
});

test('GET /api/v1/users/me acepta JWT válido y responde 200', async () => {
  const response = await request(app()).get('/api/v1/users/me')
    .set('Authorization', `Bearer ${signToken(customer)}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.role, 'customer');
});

test('POST /api/v1/products rechaza usuario cliente con 403', async () => {
  const response = await request(app()).post('/api/v1/products')
    .set('Authorization', `Bearer ${signToken(customer)}`)
    .send({ category_id: 1, name: 'Otro notebook', brand: 'Marca', sku: 'NB-002', price_clp: 400000, stock: 1 });
  assert.equal(response.status, 403);
});

test('POST /api/v1/products permite administrador y responde 201', async () => {
  const response = await request(app()).post('/api/v1/products')
    .set('Authorization', `Bearer ${signToken(admin)}`)
    .send({ category_id: 1, name: 'Notebook nuevo', brand: 'Marca', sku: 'NB-002', price_clp: 400000, stock: 1 });
  assert.equal(response.status, 201);
  assert.equal(response.body.id, 42);
});

test('CORS permite el frontend de NEXBYTE', async () => {
  const response = await request(app()).get('/api/v1/health')
    .set('Origin', 'https://nexbyte-hito-2.onrender.com');
  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], 'https://nexbyte-hito-2.onrender.com');
});

test('CORS impide orígenes no autorizados', async () => {
  const response = await request(app()).get('/api/v1/health')
    .set('Origin', 'https://ejemplo-no-permitido.com');
  assert.equal(response.status, 403);
});
