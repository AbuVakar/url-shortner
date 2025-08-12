const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

// CORS configuration with performance optimizations
const allowedOrigins = [
  'http://localhost:3000',
  'https://url-shortner-psi-one.vercel.app',
  'https://url-shortner-dcei.onrender.com',
  'https://url-shortener-frontend-1.onrender.com'
];

// Cache for CORS preflight
const corsCache = new Map();

// Custom CORS middleware with performance optimizations
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const requestMethod = req.method;
  const requestHeaders = req.headers['access-control-request-headers'];
  
  // Log incoming requests (can be disabled in production)
  console.log(`[${new Date().toISOString()}] ${requestMethod} ${req.path} from ${origin || 'unknown origin'}`);
  
  // Handle preflight requests
  if (requestMethod === 'OPTIONS') {
    console.log('Handling preflight request');
    
    // Check if origin is allowed
    const isAllowed = !origin || allowedOrigins.includes(origin) || 
      allowedOrigins.some(allowed => origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`));
    
    if (isAllowed) {
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', requestHeaders || 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '600'); // Cache for 10 minutes
      
      // End preflight request
      return res.status(204).end();
    } else {
      // Origin not allowed
      console.warn(`CORS blocked preflight from: ${origin}`);
      return res.status(403).json({ 
        error: 'Not allowed by CORS',
        message: `The origin '${origin}' is not allowed to access this resource`
      });
    }
  }
  
  // For non-preflight requests, set CORS headers if origin is allowed
  if (!origin || allowedOrigins.includes(origin) || 
      allowedOrigins.some(allowed => origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`))) {
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin'); // Important for caching
  }
  
  // Continue to next middleware
  next();
};

// Apply CORS middleware
app.use(corsMiddleware);

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use(express.json());

// Optimized MongoDB connection settings
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,  // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity
  maxPoolSize: 10,                // Maintain up to 10 socket connections
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
  retryWrites: true,
  w: 'majority'
};

// Connect to MongoDB with retry logic
const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB...');
  return mongoose.connect(process.env.MONGO_URI, mongooseOptions)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Start initial connection
connectWithRetry();

// Import routes
const urlRoutes = require("./routes/urlRoutes");
app.use("/", urlRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
