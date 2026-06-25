import { Router } from 'express';
import {
  upsertProgress,
  listHistory,
  getProgress,
  clearHistory,
} from '../controllers/historyController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listHistory);
router.post('/', upsertProgress);
router.delete('/', clearHistory);
router.get('/:videoId', getProgress);

export default router;
