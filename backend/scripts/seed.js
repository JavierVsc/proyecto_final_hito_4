import { pool } from '../src/db/pool.js';

const photos = {
  notebook:'https://images.unsplash.com/photo-1659135890084-930731031f40?w=1100&q=85&fit=crop',
  celular:'https://images.unsplash.com/photo-1509745651274-ddeb337c854a?w=1100&q=85&fit=crop',
  consola:'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=1100&q=85&fit=crop',
  audifonos:'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1100&q=85&fit=crop',
  monitor:'https://images.unsplash.com/photo-1614179924047-e1ab49a0a0cf?w=1100&q=85&fit=crop',
  teclado:'https://images.unsplash.com/photo-1674621703172-ef68b33e52da?w=1100&q=85&fit=crop',
  mouse:'https://images.unsplash.com/photo-1662323861979-0538474387e3?w=1100&q=85&fit=crop',
  reloj:'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=1100&q=85&fit=crop',
  camara:'https://images.unsplash.com/photo-1654701502319-344c0d50677f?w=1100&q=85&fit=crop',
};
const categories = [
  [1, 'Notebooks', 'notebooks'], [2, 'Gaming', 'gaming'], [3, 'Celulares', 'celulares'],
  [4, 'Audio', 'audio'], [5, 'Monitores', 'monitores'], [6, 'Accesorios', 'accesorios'],
];
const items = [
  [1,'Notebook ultraligero 13”','Computación','NB-001','Notebook liviano para estudio y productividad. Diseño compacto, teclado de tamaño completo y excelente portabilidad.',649990,5,photos.notebook],
  [3,'Smartphone pantalla OLED','Telefonía','CE-001','Smartphone con pantalla de alta calidad, cámara avanzada y conectividad para el día a día.',489990,6,photos.celular],
  [2,'Consola de videojuegos','Entretenimiento','GA-001','Consola de sobremesa para disfrutar juegos, entretenimiento y experiencias inmersivas.',529990,4,photos.consola],
  [4,'Audífonos inalámbricos','Audio','AU-001','Audífonos de diadema inalámbricos para música, estudio y entretenimiento.',79990,15,photos.audifonos],
  [5,'Monitor gaming panorámico','Pantallas','MO-001','Monitor panorámico ideal para una estación de trabajo o configuración gaming.',279990,7,photos.monitor],
  [6,'Teclado mecánico RGB','Periféricos','AC-001','Teclado mecánico con iluminación multicolor y respuesta táctil.',69990,12,photos.teclado],
  [6,'Mouse gamer ergonómico','Periféricos','AC-002','Mouse orientado a sesiones prolongadas de juego o trabajo.',34990,16,photos.mouse],
  [6,'Reloj inteligente deportivo','Wearables','AC-003','Reloj inteligente con pantalla táctil y monitoreo de actividad.',119990,8,photos.reloj],
  [6,'Cámara digital mirrorless','Fotografía','AC-004','Cámara digital compacta con lente intercambiable para fotografía y vídeo.',719990,3,photos.camara],
];

const client = await pool.connect();
try {
  await client.query('BEGIN');
  for (const [id, name, slug] of categories) {
    await client.query(
      'INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [id, name, slug]
    );
  }
  await client.query(`SELECT setval(pg_get_serial_sequence('categories', 'id'),
    (SELECT MAX(id) FROM categories))`);
  for (const [category_id, name, brand, sku, description, price_clp, stock, image] of items) {
    const product = await client.query(
      `INSERT INTO products (category_id, name, brand, sku, description, price_clp, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (sku) DO NOTHING RETURNING id`,
      [category_id, name, brand, sku, description, price_clp, stock]
    );
    if (product.rows[0]) {
      await client.query(
        'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1, $2, 0)',
        [product.rows[0].id, image]
      );
    }
  }
  await client.query('COMMIT');
  console.log('Categorías y catálogo inicial de NEXBYTE preparados.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Error al cargar el catálogo:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
