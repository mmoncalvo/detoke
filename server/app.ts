import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { apiRoutes } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/** Builds the Express app with the API. server.ts adds Vite or the static files. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Behind Render's proxy: real client IPs and secure cookies.
  if (config.isProduction) app.set('trust proxy', 1);
  app.use(compression());
  if (!config.isProduction && !config.isTest) app.use(morgan('dev'));
  app.use('/api', cors({ origin: config.isProduction ? config.corsOrigins : true }));
  app.use(express.json());
  // Uploads can live on a mounted disk (UPLOADS_DIR); seed photos ship in the repo.
  app.use('/data/uploads', express.static(config.uploadsDir));
  app.use('/data', express.static(config.dataDir));
  app.use('/api', apiRoutes);
  app.use('/api', notFound);
  app.use('/api', errorHandler);
  return app;
}
