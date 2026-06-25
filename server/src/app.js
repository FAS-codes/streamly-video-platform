import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());
  app.use(morgan('dev'));

  // Serve transcoded HLS output and thumbnails. Raw uploads stay private.
  const staticOpts = { setHeaders: (res) => res.set('Access-Control-Allow-Origin', '*') };
  app.use('/static/media', express.static(config.storage.media, staticOpts));
  app.use('/static/thumbnails', express.static(config.storage.thumbnails, staticOpts));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/history', historyRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
