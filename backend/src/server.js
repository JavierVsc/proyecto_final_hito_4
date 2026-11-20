import { createApp } from './app.js';
import { environment, assertServerConfig } from './config.js';
import { pool } from './db/pool.js';

assertServerConfig();
const port = environment().port;
const app = createApp();
const server = app.listen(port, () => console.log(`NEXBYTE API escuchando en el puerto ${port}`));

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
