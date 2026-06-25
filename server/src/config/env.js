import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/src/config -> server/
const serverRoot = path.resolve(__dirname, '..', '..');

const storageDir = path.resolve(serverRoot, process.env.STORAGE_DIR || 'storage');

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/video_mern',
  jwtSecret: process.env.JWT_SECRET || 'insecure_dev_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 500) * 1024 * 1024,
  serverRoot,
  storage: {
    root: storageDir,
    uploads: path.join(storageDir, 'uploads'),
    media: path.join(storageDir, 'media'),
    thumbnails: path.join(storageDir, 'thumbnails'),
  },
};
