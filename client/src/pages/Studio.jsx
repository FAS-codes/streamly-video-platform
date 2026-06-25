import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../api.js';

const STATUS_LABEL = {
  uploaded: 'Queued',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

export default function Studio() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const load = () =>
    api.get('/videos/mine').then((r) => {
      setItems(r.data.items);
      setLoading(false);
      return r.data.items;
    });

  useEffect(() => {
    load();
    // Poll while anything is still transcoding.
    timer.current = setInterval(async () => {
      const list = await load();
      if (!list.some((v) => v.status === 'uploaded' || v.status === 'processing')) {
        clearInterval(timer.current);
      }
    }, 3000);
    return () => clearInterval(timer.current);
  }, []);

  const remove = async (id) => {
    if (!confirm('Delete this video?')) return;
    await api.delete(`/videos/${id}`);
    setItems((prev) => prev.filter((v) => v._id !== id));
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h2>Your Studio</h2>
      {items.length === 0 ? (
        <div className="empty">
          <p>You haven't uploaded anything yet.</p>
          <Link to="/upload" className="btn btn-primary">
            Upload your first video
          </Link>
        </div>
      ) : (
        <table className="studio-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Status</th>
              <th>Views</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v._id}>
                <td>
                  {v.thumbnail ? (
                    <img className="mini-thumb" src={assetUrl(v.thumbnail)} alt="" />
                  ) : (
                    <div className="mini-thumb placeholder">▶</div>
                  )}
                </td>
                <td>
                  {v.status === 'ready' ? <Link to={`/watch/${v._id}`}>{v.title}</Link> : v.title}
                </td>
                <td>
                  <span className={`badge badge-${v.status}`}>{STATUS_LABEL[v.status]}</span>
                  {v.status === 'failed' && v.statusMessage && (
                    <div className="error small">{v.statusMessage}</div>
                  )}
                </td>
                <td>{v.views}</td>
                <td>
                  <button className="btn btn-danger" onClick={() => remove(v._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
