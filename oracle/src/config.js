export const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api';
export const ENABLE_REDDIT = process.env.ENABLE_REDDIT !== 'false';
export const ENABLE_INSTAGRAM = process.env.ENABLE_INSTAGRAM === 'true';
export const UPDATE_INTERVAL_MS = parseInt(process.env.UPDATE_INTERVAL_MS || '3600000', 10);