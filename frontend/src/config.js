const DEFAULT_API_BASE_URL = 'http://localhost:8000';

export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');
