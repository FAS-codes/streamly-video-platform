import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

/**
 * Adaptive HLS player. Uses hls.js where MSE is available and falls back to
 * native HLS (Safari). Resumes from `startAt` seconds and reports progress
 * back up via `onProgress` so the parent can persist watch history.
 */
export default function VideoPlayer({ src, poster, startAt = 0, onProgress }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Prefer hls.js (MSE) where available. Chromium/Firefox report "maybe" for
    // native HLS but can't actually play it, so native is the fallback only.
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src; // Safari / iOS native HLS
    }

    const seekToStart = () => {
      if (startAt > 0 && startAt < (video.duration || Infinity)) {
        video.currentTime = startAt;
      }
    };
    video.addEventListener('loadedmetadata', seekToStart);

    return () => {
      video.removeEventListener('loadedmetadata', seekToStart);
      if (hls) hls.destroy();
    };
  }, [src, startAt]);

  // Throttled progress reporting (every ~5s of playback) + on pause/end.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;

    let last = 0;
    const report = (completed = false) => {
      onProgress(Math.floor(video.currentTime), completed);
    };
    const onTime = () => {
      if (video.currentTime - last >= 5) {
        last = video.currentTime;
        report();
      }
    };
    const onPause = () => report();
    const onEnded = () => report(true);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [onProgress]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      style={{ width: '100%', borderRadius: 12, background: '#000', aspectRatio: '16 / 9' }}
    />
  );
}
