import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';

export default function Watch() {
  const { id } = useParams();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [startAt, setStartAt] = useState(0);
  const [error, setError] = useState('');
  const viewCounted = useRef(false);

  useEffect(() => {
    setVideo(null);
    setError('');
    viewCounted.current = false;

    api
      .get(`/videos/${id}`)
      .then((r) => setVideo(r.data.video))
      .catch(() => setError('Video not found'));

    // Resume point (only for logged-in users).
    if (user) {
      api.get(`/history/${id}`).then((r) => setStartAt(r.data.progress || 0)).catch(() => {});
    }
  }, [id, user]);

  // Persist progress (logged-in users only). Debounced by the player itself.
  const onProgress = useCallback(
    (progress, completed) => {
      if (!user) return;
      api.post('/history', { videoId: id, progress, completed }).catch(() => {});
    },
    [id, user]
  );

  const onPlay = () => {
    if (viewCounted.current) return;
    viewCounted.current = true;
    api.post(`/videos/${id}/view`).catch(() => {});
  };

  if (error) return <p className="error">{error}</p>;
  if (!video) return <p className="muted">Loading…</p>;

  if (video.status !== 'ready') {
    return (
      <div className="empty">
        <h2>{video.title}</h2>
        <p className="muted">
          This video is still {video.status === 'failed' ? 'unavailable' : 'being processed'}.
        </p>
      </div>
    );
  }

  return (
    <div className="watch">
      <div onPlayCapture={onPlay}>
        <VideoPlayer
          src={assetUrl(video.masterPlaylist)}
          poster={assetUrl(video.thumbnail)}
          startAt={startAt}
          onProgress={onProgress}
        />
      </div>
      <h1>{video.title}</h1>
      <p className="muted">
        {video.owner?.name || 'Unknown'} · {video.views} views
      </p>
      {video.description && <p className="description">{video.description}</p>}
      {!user && <p className="muted">Sign in to save your watch history and resume later.</p>}
    </div>
  );
}
