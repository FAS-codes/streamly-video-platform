import { Link } from 'react-router-dom';
import { assetUrl } from '../api.js';

function formatDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoCard({ video, progress }) {
  const pct = progress && video.duration ? Math.min(100, (progress / video.duration) * 100) : 0;

  return (
    <Link to={`/watch/${video._id}`} className="card">
      <div className="thumb">
        {video.thumbnail ? (
          <img src={assetUrl(video.thumbnail)} alt={video.title} loading="lazy" />
        ) : (
          <div className="thumb-placeholder">▶</div>
        )}
        {video.duration > 0 && <span className="duration">{formatDuration(video.duration)}</span>}
        {pct > 0 && <span className="resume-bar" style={{ width: `${pct}%` }} />}
      </div>
      <div className="card-body">
        <h3>{video.title}</h3>
        <p className="muted">
          {video.owner?.name || 'Unknown'} · {video.views || 0} views
        </p>
      </div>
    </Link>
  );
}
