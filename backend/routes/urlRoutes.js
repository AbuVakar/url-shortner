const express = require("express");
const router = express.Router();
const { nanoid } = require("nanoid");
const Url = require("../models/Url");

// Simple admin authentication middleware (for demo only - use proper auth in production)
const isAdmin = (req, res, next) => {
  try {
    // In a real app, use proper authentication (JWT, sessions, etc.)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Get token after 'Bearer '
    const adminSecret = process.env.ADMIN_SECRET || 'admin123';
    
    if (token && token === adminSecret) {
      return next();
    }
    
    console.log('Auth failed - token:', token ? 'provided' : 'missing');
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized: Invalid or missing token' 
    });
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during authentication' 
    });
  }
};

// Admin login endpoint
router.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    const adminSecret = process.env.ADMIN_SECRET || 'admin123';
    
    if (password === adminSecret) {
      // In a real app, use JWT with proper expiration
      return res.json({ 
        success: true,
        token: adminSecret,
        message: 'Login successful',
        // Token expires in 24 hours
        expiresIn: 24 * 60 * 60 * 1000
      });
    }
    
    // Don't reveal whether the password was wrong or the account doesn't exist
    console.log('Failed login attempt');
    res.status(401).json({ 
      success: false,
      error: 'Invalid credentials' 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// Create short URL
router.post("/api/shorten", async (req, res) => {
  const { original_url } = req.body;
  if (!original_url) return res.status(400).json({ error: "URL is required" });

  const short_code = nanoid(6);
  const newUrl = new Url({ original_url, short_code });
  await newUrl.save();

  // Always use the configured BASE_URL for short URLs
  // This ensures consistent domain usage across all environments
  const frontendDomain = process.env.BASE_URL || 'https://url-shortner-psi-one.vercel.app';
  const shortUrl = `${frontendDomain}/${short_code}`;
  
  console.log('Generated short URL:', shortUrl);
  res.json({ 
    short_url: shortUrl,
    short_code
  });
});

// Redirect to original URL and increment visit count
router.get("/:code", async (req, res) => {
  try {
    const urlData = await Url.findOneAndUpdate(
      { short_code: req.params.code },
      { $inc: { visits: 1 }, $set: { updated_at: new Date() } },
      { new: true }
    );
    
    if (urlData) {
      // Check if it's an AJAX request
      if (req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest') {
        return res.json({ redirect: urlData.original_url });
      } else {
        // Regular browser request
        return res.redirect(302, urlData.original_url);
      }
    } else {
      if (req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest') {
        return res.status(404).json({ error: "URL not found" });
      } else {
        // For direct browser access, send a simple HTML response
        return res.status(404).send('<h1>404 - URL not found</h1>');
      }
    }
  } catch (err) {
    console.error("Redirect error:", err);
    if (req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest') {
      return res.status(500).json({ error: "Server error" });
    } else {
      return res.status(500).send('<h1>500 - Server Error</h1>');
    }
  }
});

// Admin: Get all URLs
router.get("/api/admin/urls", isAdmin, async (req, res) => {
  try {
    // In a production app, verify admin status here
    // if (!req.user || !req.user.isAdmin) {
    //   return res.status(403).json({ error: "Access denied" });
    // }
    
    const urls = await Url.find({}, { _id: 0, __v: 0 }).sort({ created_at: -1 });
    res.json(urls);
  } catch (err) {
    console.error("Admin URL fetch error:", err);
    res.status(500).json({ error: "Failed to fetch URLs" });
  }
});

// Admin: Delete URL (Optimized for performance)
router.delete("/api/admin/urls/:code", isAdmin, async (req, res) => {
  try {
    // Use deleteOne directly without checking first for better performance
    const result = await Url.deleteOne({ short_code: req.params.code });
    
    // If you need to know if the document was deleted, use result.deletedCount
    // But don't make an extra query just to check if it existed
    return res.json({ 
      success: true,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;