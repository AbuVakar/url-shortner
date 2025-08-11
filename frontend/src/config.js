// Backend API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Use environment variable if available, otherwise fallback to hardcoded URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://url-shortner-backend-1d8z.onrender.com';

// In development, use localhost; in production, use the deployed URL
export const API_URL = isDevelopment 
  ? 'http://localhost:5000'
  : API_BASE_URL;

// Axios defaults
export const axiosConfig = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};
