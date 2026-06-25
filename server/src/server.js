import fs from 'fs/promises';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { requeueInterrupted } from './queue/transcodeQueue.js';

async function start() {
  // Ensure storage directories exist.
  await Promise.all(
    [config.storage.uploads, config.storage.media, config.storage.thumbnails].map((d) =>
      fs.mkdir(d, { recursive: true })
    )
  );

  await connectDB();
  await requeueInterrupted();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
