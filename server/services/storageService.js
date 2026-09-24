const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const storageMode = String(process.env.STORAGE_MODE || 'local').toLowerCase();
const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'));
const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'edunex-files';

function useSupabase() {
  return storageMode === 'supabase';
}

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('STORAGE_MODE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
}

function safeName(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}

function normalizeKey(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function virtualPath(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

function storageKeyFromPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  const marker = normalized.toLowerCase().indexOf('/uploads/');
  if (marker >= 0) return normalized.slice(marker + '/uploads/'.length);
  if (normalized.toLowerCase().startsWith('uploads/')) return normalized.slice('uploads/'.length);
  return normalized.replace(/^\/+/, '');
}

async function saveUpload({ buffer, originalName, contentType, folder }) {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Upload buffer is required');
  const filename = safeName(originalName);
  const key = normalizeKey(`${folder}/${filename}`);
  if (useSupabase()) {
    assertSupabaseConfig();
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: buffer,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase Storage upload failed (${response.status}): ${body.slice(0, 500)}`);
    }
  } else {
    const target = path.join(uploadsRoot, key);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, buffer);
  }
  return { filePath: virtualPath(folder, filename), key, filename };
}

async function removeUpload(filePath) {
  if (!filePath) return;
  const key = storageKeyFromPath(filePath);
  if (useSupabase()) {
    assertSupabaseConfig();
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw new Error(`Supabase Storage delete failed (${response.status}): ${body.slice(0, 500)}`);
    }
    return;
  }
  const localPath = path.join(uploadsRoot, key);
  if (fs.existsSync(localPath)) await fsp.unlink(localPath);
}

async function downloadUpload(filePath) {
  const key = storageKeyFromPath(filePath);
  if (useSupabase()) {
    assertSupabaseConfig();
    const response = await fetch(`${supabaseUrl}/storage/v1/object/download/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase Storage download failed (${response.status}): ${body.slice(0, 500)}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return fsp.readFile(path.join(uploadsRoot, key));
}

async function getAccessUrl(filePath, expiresIn = 3600) {
  if (!filePath) return null;
  if (!useSupabase()) return String(filePath).startsWith('/') ? filePath : `/${filePath}`;
  assertSupabaseConfig();
  const key = storageKeyFromPath(filePath);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.signedURL) {
    throw new Error(`Supabase Storage signing failed (${response.status}): ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data.signedURL.startsWith('http') ? data.signedURL : `${supabaseUrl}/storage/v1${data.signedURL}`;
}

module.exports = {
  storageMode,
  useSupabase,
  saveUpload,
  removeUpload,
  downloadUpload,
  getAccessUrl,
  storageKeyFromPath,
};
