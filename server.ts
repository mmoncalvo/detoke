// Entry point: Express serves the API on /api and the web app on the same port.
// In development it mounts Vite as middleware; in production it serves dist/.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './server/config.js';
import { initDb } from './server/db.js';
import { createApp } from './server/app.js';

const root = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await initDb();
  const app = createApp();

  if (config.isProduction) {
    const dist = path.join(root, 'dist');
    app.use(express.static(dist));
    app.get(/^(?!\/(api|data)(\/|$)).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: { port: config.port + 20000 } }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`detoke listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
