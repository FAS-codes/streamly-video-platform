import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { config } from '../config/env.js';

// Prefer the bundled static binaries (work on Render/anywhere with no system
// ffmpeg); fall back to PATH lookup if for some reason they're unavailable.
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

// Rendition ladder. Sources smaller than a tier's height are skipped.
const LADDER = [
  { height: 360, videoBitrate: '800k', audioBitrate: '96k', bandwidth: 900000 },
  { height: 720, videoBitrate: '2500k', audioBitrate: '128k', bandwidth: 2800000 },
];

export function probe(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find((s) => s.codec_type === 'video') || {};
      resolve({
        duration: Number(data.format?.duration) || 0,
        height: stream.height || 0,
        width: stream.width || 0,
      });
    });
  });
}

function makeThumbnail(filePath, outDir, atSecond) {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .on('end', () => resolve('thumb.jpg'))
      .on('error', reject)
      .screenshots({
        timestamps: [Math.max(1, Math.floor(atSecond))],
        filename: 'thumb.jpg',
        folder: outDir,
        size: '640x?',
      });
  });
}

// NOTE: fluent-ffmpeg splits output-option strings on spaces, so option values
// must never contain spaces. We run ffmpeg entirely inside a space-free temp dir
// (the project path may contain spaces) and move the results into storage after.
function transcodeRendition(filePath, outDir, rendition) {
  const name = `${rendition.height}p`;
  const playlist = `${name}.m3u8`;
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-profile:v',
        'main',
        '-crf',
        '20',
        '-vf',
        `scale=-2:${rendition.height}`,
        '-b:v',
        rendition.videoBitrate,
        '-c:a',
        'aac',
        '-b:a',
        rendition.audioBitrate,
        '-ac',
        '2',
        '-hls_time',
        '6',
        '-hls_playlist_type',
        'vod',
        '-hls_segment_filename',
        path.join(outDir, `${name}_%03d.ts`),
      ])
      .output(path.join(outDir, playlist))
      .on('end', () => resolve({ height: rendition.height, bandwidth: rendition.bandwidth, playlist }))
      .on('error', reject)
      .run();
  });
}

function writeMasterPlaylist(outDir, renditions) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const r of renditions) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=x${r.height}`);
    lines.push(r.playlist);
  }
  return fs.writeFile(path.join(outDir, 'master.m3u8'), lines.join('\n') + '\n');
}

// Copy every file from src dir into dest dir (flat), creating dest if needed.
async function moveDirContents(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir);
  for (const name of entries) {
    await fs.copyFile(path.join(srcDir, name), path.join(destDir, name));
  }
}

/**
 * Full pipeline for one video. Returns paths relative to the storage root
 * so they can be persisted and served statically.
 */
export async function transcodeToHLS(sourceAbsPath, videoId) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vmern-'));
  const workMedia = path.join(work, 'media');
  const workThumb = path.join(work, 'thumb');
  await fs.mkdir(workMedia, { recursive: true });
  await fs.mkdir(workThumb, { recursive: true });

  try {
    const meta = await probe(sourceAbsPath);

    // Only produce tiers at or below the source height; always keep at least one.
    let tiers = LADDER.filter((t) => t.height <= (meta.height || 720));
    if (tiers.length === 0) tiers = [LADDER[0]];

    const renditions = [];
    for (const tier of tiers) {
      renditions.push(await transcodeRendition(sourceAbsPath, workMedia, tier));
    }
    await writeMasterPlaylist(workMedia, renditions);
    await makeThumbnail(sourceAbsPath, workThumb, meta.duration * 0.1);

    // Publish results into storage (paths here may contain spaces — fs handles it).
    const mediaDir = path.join(config.storage.media, videoId);
    const thumbDir = path.join(config.storage.thumbnails, videoId);
    await moveDirContents(workMedia, mediaDir);
    await moveDirContents(workThumb, thumbDir);

    const rel = (abs) => path.relative(config.storage.root, abs);
    return {
      duration: meta.duration,
      masterPlaylist: rel(path.join(mediaDir, 'master.m3u8')),
      thumbnail: rel(path.join(thumbDir, 'thumb.jpg')),
      renditions,
    };
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}
