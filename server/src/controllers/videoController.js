import path from 'path';
import { config } from '../config/env.js';
import { Video, VIDEO_STATUS } from '../models/Video.js';
import { enqueueTranscode } from '../queue/transcodeQueue.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

export const uploadVideoHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No video file uploaded (field name: "video")');
  const { title, description } = req.body;
  if (!title) throw new ApiError(400, 'title is required');

  const sourcePath = path.relative(config.storage.root, req.file.path);

  const video = await Video.create({
    title,
    description: description || '',
    owner: req.userId,
    originalFilename: req.file.originalname,
    sourcePath,
    status: VIDEO_STATUS.UPLOADED,
    statusMessage: 'Queued for transcoding…',
  });

  enqueueTranscode(video._id);
  res.status(201).json({ video });
});

// Public list of ready videos (newest first), with simple search + pagination.
export const listVideos = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 12);
  const q = (req.query.q || '').trim();

  const filter = { status: VIDEO_STATUS.READY };
  if (q) filter.title = { $regex: q, $options: 'i' };

  const [items, total] = await Promise.all([
    Video.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('owner', 'name')
      .lean(),
    Video.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// Videos owned by the current user (any status) — for the studio/dashboard.
export const myVideos = asyncHandler(async (req, res) => {
  const items = await Video.find({ owner: req.userId }).sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate('owner', 'name').lean();
  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ video });
});

// Called when playback starts; increments view count.
export const incrementView = asyncHandler(async (req, res) => {
  await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
  res.json({ ok: true });
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (String(video.owner) !== req.userId) throw new ApiError(403, 'Not your video');
  await video.deleteOne();
  res.json({ ok: true });
});
