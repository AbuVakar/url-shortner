const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

// Configure CORS with specific origin and credentials support
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://url-shortner-green-eight.vercel.app',
  'https://url-shortner-git-master-abuvakar.vercel.app',
  'https://url-shortner-abuvakar.vercel.app'
];

// Function to handle CORS
const handleCors = (req, res, next) => {
  const origin = req.headers.origin;
  const requestMethod = req.method;
  const requestHeaders = req.headers['access-control-request-headers'];
  
  console.log(`Incoming ${requestMethod} request from origin: ${origin}`);
  
  // Always set Vary header for proper caching
  res.header('Vary', 'Origin');
  
  // In development, allow all origins for easier testing
  if (process.env.NODE_ENV !== 'production' || !origin || allowedOrigins.includes(origin)) {
    // Set the specific origin (not *) when credentials are required
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (requestMethod === 'OPTIONS') {
      // Cache preflight response for 2 hours (Chromium maximum)
      res.header('Access-Control-Max-Age', '7200');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', requestHeaders || 'Content-Type, Authorization, Content-Length, X-Requested-With');
      res.header('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count');
      
      // End the preflight request
      return res.status(204).end();
    }
    
    // For non-preflight requests, just continue
    return next();
  }
  
  // Not allowed by CORS
  console.warn(`CORS blocked request from origin: ${origin}`);
  res.status(403).json({ 
    error: 'Not allowed by CORS',
    message: `The origin '${origin}' is not allowed to access this resource`,
    allowedOrigins: process.env.NODE_ENV === 'production' ? undefined : allowedOrigins
  });
};

// Apply CORS middleware
app.use(handleCors);

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// Import routes
const urlRoutes = require("./routes/urlRoutes");
app.use("/", urlRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
