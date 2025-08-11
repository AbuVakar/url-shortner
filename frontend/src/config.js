// Backend API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Get API URL from environment variables with fallback
const getApiBaseUrl = () => {
  // In development, always use localhost
  if (isDevelopment) return 'http://localhost:5000';
  
  // In production, use the environment variable or fallback to production URL
  return process.env.REACT_APP_API_URL || 'https://url-shortner-backend-1d8z.onrender.com';
};

export const API_URL = getApiBaseUrl();

// Log the current API URL for debugging (only in development)
if (isDevelopment) {
  console.log('Using API URL:', API_URL);
}

// Function to get axios config with optional auth token
export const getAxiosConfig = (token) => {
  const config = {
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    // Include credentials for all requests
    withCredentials: true,
    // Add timeout to prevent hanging requests
    timeout: 10000,
  };

  // Add auth token if provided
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};
