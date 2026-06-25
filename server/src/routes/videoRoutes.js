import { Router } from 'express';
import {
  uploadVideoHandler,
  listVideos,
  myVideos,
  getVideo,
  incrementView,
  deleteVideo,
} from '../controllers/videoController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadVideo } from '../middleware/upload.js';
import { ApiError } from '../utils/asyncHandler.js';

const router = Router();

// Wrap multer so its errors (e.g. file too large) become clean JSON.
function handleUpload(req, res, next) {
  uploadVideo(req, res, (err) => {
    if (err) return next(err instanceof ApiError ? err : new ApiError(400, err.message));
    next();
  });
}

router.get('/', listVideos);
router.get('/mine', requireAuth, myVideos);
router.post('/', requireAuth, handleUpload, uploadVideoHandler);
router.get('/:id', getVideo);
router.post('/:id/view', incrementView);
router.delete('/:id', requireAuth, deleteVideo);

export default router;
