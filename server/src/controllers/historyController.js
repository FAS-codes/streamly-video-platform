import { WatchHistory } from '../models/WatchHistory.js';
import { Video } from '../models/Video.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// Upsert progress for the current user on a video (called periodically by the player).
export const upsertProgress = asyncHandler(async (req, res) => {
  const { videoId, progress, completed } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const video = await Video.findById(videoId).select('_id');
  if (!video) throw new ApiError(404, 'Video not found');

  const entry = await WatchHistory.findOneAndUpdate(
    { user: req.userId, video: videoId },
    {
      $set: {
        progress: Math.max(0, Number(progress) || 0),
        completed: Boolean(completed),
        lastWatchedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  res.json({ entry });
});

// Watch history list, most recent first, with the populated video.
export const listHistory = asyncHandler(async (req, res) => {
  const items = await WatchHistory.find({ user: req.userId })
    .sort({ lastWatchedAt: -1 })
    .limit(50)
    .populate({ path: 'video', populate: { path: 'owner', select: 'name' } })
    .lean();

  // Drop entries whose video was deleted.
  res.json({ items: items.filter((i) => i.video) });
});

// Resume point for a single video (used to seek the player on load).
export const getProgress = asyncHandler(async (req, res) => {
  const entry = await WatchHistory.findOne({
    user: req.userId,
    video: req.params.videoId,
  }).lean();
  res.json({ progress: entry?.progress || 0, completed: entry?.completed || false });
});

export const clearHistory = asyncHandler(async (req, res) => {
  await WatchHistory.deleteMany({ user: req.userId });
  res.json({ ok: true });
});
