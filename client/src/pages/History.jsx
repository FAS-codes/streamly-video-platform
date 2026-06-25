import { useEffect, useState } from 'react';
import { api } from '../api.js';
import VideoCard from '../components/VideoCard.jsx';

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/history').then((r) => {
      setItems(r.data.items);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const clear = async () => {
    if (!confirm('Clear your entire watch history?')) return;
    await api.delete('/history');
    setItems([]);
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="row-between">
        <h2>Watch history</h2>
        {items.length > 0 && (
          <button className="btn" onClick={clear}>
            Clear history
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="empty">
          <p className="muted">Nothing watched yet.</p>
        </div>
      ) : (
        <div className="grid">
          {items.map((h) => (
            <VideoCard key={h._id} video={h.video} progress={h.progress} />
          ))}
        </div>
      )}
    </div>
  );
}
