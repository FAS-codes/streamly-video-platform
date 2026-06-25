import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please choose a video file');
    setError('');
    setBusy(true);
    setProgress(0);

    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    form.append('video', file);

    try {
      await api.post('/videos', form, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      navigate('/studio');
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setBusy(false);
    }
  };

  return (
    <div className="auth-card wide">
      <h2>Upload a video</h2>
      <form onSubmit={submit}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label>Video file</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0] || null)}
          required
        />

        {busy && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <span className="muted">{progress}% uploaded — transcoding starts automatically</span>
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
