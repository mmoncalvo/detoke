import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { apiRoutes } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/** Arma la app de Express con la API. server.ts le agrega Vite o los estáticos. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  if (!config.isProduction && !config.isTest) app.use(morgan('dev'));
  app.use('/api', cors({ origin: config.isProduction ? config.corsOrigins : true }));
  app.use(express.json());
  app.use('/data', express.static(config.dataDir));
  app.use('/api', apiRoutes);
  app.use('/api', notFound);
  app.use('/api', errorHandler);
  return app;
}
