import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

export const api = axios.create({ baseURL: `${API_URL}/api` });

// Attach the JWT (if any) to every request.
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Build an absolute URL to a static asset (HLS playlist, thumbnail).
export const assetUrl = (relPath) => (relPath ? `${API_URL}/static/${relPath}` : '');
