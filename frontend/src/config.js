// Backend API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Use environment variable if available, otherwise fallback to hardcoded URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://url-shortner-backend-1d8z.onrender.com';

// In development, use localhost; in production, use the deployed URL
export const API_URL = isDevelopment 
  ? 'http://localhost:5000'
  : API_BASE_URL;

// Log the current API URL for debugging
console.log('Using API URL:', API_URL);

// Function to get axios config with optional auth token
export const getAxiosConfig = (token) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    // Only include credentials for same-origin requests in production
    withCredentials: !isDevelopment,
  };

  // Add auth token if provided
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};
