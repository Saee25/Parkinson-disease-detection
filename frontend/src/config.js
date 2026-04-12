/** Base URL for the FastAPI diagnostic engine (no trailing slash). */
export const API_BASE =
  (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
