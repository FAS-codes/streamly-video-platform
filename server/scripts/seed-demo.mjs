#!/usr/bin/env node
/**
 * Seed the platform with demo videos so the live site has content to show.
 *
 * Render's free tier has an ephemeral filesystem — uploaded/transcoded videos
 * are wiped whenever the service redeploys or wakes from sleep. Re-run this
 * script to repopulate the demo.
 *
 * Usage:
 *   node scripts/seed-demo.mjs                        # seeds http://localhost:5050
 *   API_URL=https://your-api.onrender.com node scripts/seed-demo.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_URL = (process.env.API_URL || 'http://localhost:5050').replace(/\/$/, '');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.join(__dirname, '..', 'samples');

const DEMO = { name: 'Streamly Demo', email: 'demo@streamly.app', password: 'demo1234' };

const CLIPS = [
  { file: 'welcome.mp4', title: 'Welcome to Streamly', description: 'A quick tour. Every upload is transcoded to adaptive HLS automatically.' },
  { file: 'adaptive.mp4', title: 'Adaptive Streaming Demo', description: 'Served as multi-rendition HLS (360p/720p) and played with hls.js.' },
  { file: 'transcoding.mp4', title: 'Transcoding Pipeline', description: 'ffmpeg runs in a background queue; watch progress is saved so you can resume.' },
];

async function getToken() {
  // Try to register (ignore "already exists"), then log in.
  await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO),
  }).catch(() => {});

  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO.email, password: DEMO.password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  return (await res.json()).token;
}

async function upload(token, clip) {
  const buf = fs.readFileSync(path.join(samplesDir, clip.file));
  const form = new FormData();
  form.append('title', clip.title);
  form.append('description', clip.description);
  form.append('video', new Blob([buf], { type: 'video/mp4' }), clip.file);

  const res = await fetch(`${API_URL}/api/videos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload ${clip.file} failed: ${res.status} ${await res.text()}`);
  return (await res.json()).video;
}

async function main() {
  console.log(`Seeding ${API_URL} …`);
  const token = await getToken();
  console.log(`✓ authenticated as ${DEMO.email}`);

  for (const clip of CLIPS) {
    const v = await upload(token, clip);
    console.log(`✓ uploaded "${v.title}" (${v._id}) — transcoding queued`);
  }

  console.log('\nDone. Videos transcode in the background; they appear on the');
  console.log('home page once their status becomes "ready" (a few seconds each).');
  console.log(`\nDemo login → email: ${DEMO.email}  password: ${DEMO.password}`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
