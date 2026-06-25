import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { ApiError } from '../utils/asyncHandler.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.storage.uploads),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${id}${path.extname(file.originalname)}`);
  },
});

const ALLOWED = /mp4|mov|mkv|avi|webm|m4v/;

export const uploadVideo = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const okExt = ALLOWED.test(path.extname(file.originalname).toLowerCase().slice(1));
    const okMime = file.mimetype.startsWith('video/');
    if (okExt && okMime) return cb(null, true);
    cb(new ApiError(400, 'Only video files are allowed'));
  },
}).single('video');
