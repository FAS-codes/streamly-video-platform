import path from 'path';
import { config } from '../config/env.js';
import { Video, VIDEO_STATUS } from '../models/Video.js';
import { transcodeToHLS } from '../services/transcode.js';

/**
 * Minimal in-process FIFO job queue. Processes one video at a time so a burst
 * of uploads doesn't saturate the CPU. The interface (enqueue) is intentionally
 * small so it can be swapped for BullMQ/Redis without touching controllers.
 */
const queue = [];
let running = false;

export function enqueueTranscode(videoId) {
  queue.push(String(videoId));
  if (!running) drain();
}

async function drain() {
  running = true;
  while (queue.length > 0) {
    const videoId = queue.shift();
    await processOne(videoId);
  }
  running = false;
}

async function processOne(videoId) {
  const video = await Video.findById(videoId);
  if (!video) return;

  try {
    video.status = VIDEO_STATUS.PROCESSING;
    video.statusMessage = 'Transcoding to HLS…';
    await video.save();

    const sourceAbs = path.join(config.storage.root, video.sourcePath);
    const result = await transcodeToHLS(sourceAbs, videoId);

    video.duration = result.duration;
    video.masterPlaylist = result.masterPlaylist;
    video.thumbnail = result.thumbnail;
    video.renditions = result.renditions;
    video.status = VIDEO_STATUS.READY;
    video.statusMessage = '';
    await video.save();
    console.log(`[queue] video ${videoId} ready (${result.renditions.length} renditions)`);
  } catch (err) {
    console.error(`[queue] video ${videoId} failed:`, err.message);
    video.status = VIDEO_STATUS.FAILED;
    video.statusMessage = err.message?.slice(0, 300) || 'Transcoding failed';
    await video.save();
  }
}

/**
 * On boot, re-queue anything left mid-flight by a crash/restart.
 */
export async function requeueInterrupted() {
  const stuck = await Video.find({
    status: { $in: [VIDEO_STATUS.UPLOADED, VIDEO_STATUS.PROCESSING] },
  }).select('_id');
  stuck.forEach((v) => enqueueTranscode(v._id));
  if (stuck.length) console.log(`[queue] re-queued ${stuck.length} interrupted job(s)`);
}
