import { useEffect, useState } from 'react';
import { api } from '../api.js';
import VideoCard from '../components/VideoCard.jsx';

export default function Home() {
  const [data, setData] = useState({ items: [], pages: 1, page: 1 });
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/videos', { params: { q: search, page: 1, limit: 12 } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <form
        className="searchbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
        }}
      >
        <input
          placeholder="Search videos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary">Search</button>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : data.items.length === 0 ? (
        <div className="empty">
          <p>No videos yet.</p>
          <p className="muted">Upload one to get started.</p>
        </div>
      ) : (
        <div className="grid">
          {data.items.map((v) => (
            <VideoCard key={v._id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
