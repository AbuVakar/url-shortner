const express = require("express");
const router = express.Router();
const { nanoid } = require("nanoid");
const Url = require("../models/Url");

// Simple admin authentication middleware (for demo only - use proper auth in production)
const isAdmin = (req, res, next) => {
  // In a real app, use proper authentication (JWT, sessions, etc.)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Get token after 'Bearer '
  const adminSecret = process.env.ADMIN_SECRET || 'admin123';
  
  if (token && token === adminSecret) {
    return next();
  }
  console.log('Auth failed - token:', token, 'expected:', adminSecret);
  res.status(401).json({ error: 'Unauthorized' });
};

// Admin login endpoint
router.post("/api/admin/login", async (req, res) => {
  const { password } = req.body;
  const adminSecret = process.env.ADMIN_SECRET || 'admin123';
  
  if (password === adminSecret) {
    // In a real app, use JWT or sessions
    return res.json({ 
      success: true,
      token: adminSecret,
      message: 'Login successful'
    });
  }
  
  res.status(401).json({ 
    success: false,
    error: 'Invalid credentials' 
  });
});

// Create short URL - Optimized version
router.post("/api/shorten", async (req, res) => {
  try {
    const { original_url } = req.body;
    if (!original_url) return res.status(400).json({ error: "URL is required" });

    // Generate short code and save in parallel with URL validation
    const [short_code] = await Promise.all([
      nanoid(6),
      // Basic URL validation
      new Promise((resolve, reject) => {
        try {
          new URL(original_url);
          resolve();
        } catch (err) {
          reject(new Error('Invalid URL'));
        }
      })
    ]);

    // Use insertOne for better performance than save()
    const result = await Url.collection.insertOne({
      original_url,
      short_code,
      visits: 0,
      created_at: new Date(),
      updated_at: new Date()
    }, { w: 1 }); // w:1 for fire and forget

    if (!result.acknowledged) {
      throw new Error('Failed to create short URL');
    }

    // Get domain from environment or use default
    const frontendDomain = process.env.BASE_URL || 'https://url-shortner-psi-one.vercel.app';
    const shortUrl = `${frontendDomain}/${short_code}`;
    
    res.json({ 
      short_url: shortUrl,
      short_code
    });
  } catch (err) {
    console.error('Shorten error:', err);
    res.status(500).json({ 
      error: err.message === 'Invalid URL' ? 'Invalid URL provided' : 'Failed to create short URL'
    });
  }
});

// In-memory cache for frequently accessed URLs
const urlCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Redirect to original URL - Optimized version
router.get("/:code", async (req, res) => {
  const { code } = req.params;
  const isAjax = req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest';
  const cacheKey = `url:${code}`;
  
  // Try to get from cache first
  const cached = urlCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    if (isAjax) {
      return res.json({ redirect: cached.original_url });
    }
    return res.redirect(302, cached.original_url);
  }

  try {
    // Use findOneAndUpdate with projection for better performance
    const urlData = await Url.findOneAndUpdate(
      { short_code: code },
      [
        {
          $set: {
            visits: { $add: ["$visits", 1] },
            updated_at: new Date()
          }
        },
        { $project: { original_url: 1, _id: 0 } }
      ],
      {
        returnDocument: 'after',
        projection: { original_url: 1 },
        maxTimeMS: 2000 // 2 second timeout
      }
    ).lean();
    
    if (urlData?.original_url) {
      // Cache the result
      urlCache.set(cacheKey, {
        original_url: urlData.original_url,
        timestamp: Date.now()
      });
      
      if (isAjax) {
        return res.json({ redirect: urlData.original_url });
      }
      return res.redirect(302, urlData.original_url);
    }
    
    // Not found
    if (isAjax) {
      return res.status(404).json({ error: "URL not found" });
    }
    return res.status(404).send('<h1>404 - URL not found</h1>');
    
  } catch (err) {
    console.error("Redirect error:", err);
    if (isAjax) {
      return res.status(500).json({ error: "Server error" });
    }
    return res.status(500).send('<h1>500 - Server Error</h1>');
  }
});

// Cache for admin URLs list
let adminUrlsCache = null;
let adminUrlsCacheTime = 0;
const ADMIN_CACHE_TTL = 10 * 1000; // 10 seconds

// Admin: Get all URLs - Optimized version
router.get("/api/admin/urls", isAdmin, async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached response if available and fresh
    if (adminUrlsCache && (now - adminUrlsCacheTime) < ADMIN_CACHE_TTL) {
      return res.json(adminUrlsCache);
    }
    
    // Fetch from database with projection to only get needed fields
    const urls = await Url.find(
      {},
      { original_url: 1, short_code: 1, visits: 1, created_at: 1 },
      { sort: { created_at: -1 }, maxTimeMS: 2000 }
    ).lean();
    
    // Update cache
    adminUrlsCache = urls;
    adminUrlsCacheTime = now;
    
    res.json(urls);
  } catch (err) {
    console.error('Error fetching URLs:', err);
    // Return cached data even if stale in case of error
    if (adminUrlsCache) {
      return res.json(adminUrlsCache);
    }
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// Admin: Delete URL - Optimized version
router.delete("/api/admin/urls/:code", isAdmin, async (req, res) => {
  const { code } = req.params;
  
  try {
    // Invalidate cache
    adminUrlsCache = null;
    
    // Use deleteOne with write concern for better performance
    const result = await Url.deleteOne(
      { short_code: code },
      { w: 1 } // Fire and forget after primary confirms
    );
    
    // Also remove from URL cache if it exists
    const cacheKey = `url:${code}`;
    if (urlCache.has(cacheKey)) {
      urlCache.delete(cacheKey);
    }
    
    res.json({ 
      success: true,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete URL" 
    });
  }
});

module.exports = router;