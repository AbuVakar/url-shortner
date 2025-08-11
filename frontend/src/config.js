// Backend API configuration
export const API_BASE_URL = 'https://url-shortner-backend-1d8z.onrender.com';
// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_URL = isDevelopment 
  ? 'http://localhost:5000' 
  : API_BASE_URL;
