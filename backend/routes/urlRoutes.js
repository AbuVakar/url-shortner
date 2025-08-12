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
    const { code } = req.params;
    
    // Find the URL and atomically increment the visit count
    const urlData = await Url.findOneAndUpdate(
      { short_code: code },
      [
        {
          $set: {
            visits: { $add: ["$visits", 1] },
            updated_at: new Date()
          }
        }
      ],
      { 
        new: true,
        // Skip updating the visit count for admin interface requests
        ...(req.get('Referer')?.includes('/admin') ? { runValidators: false } : {})
      }
    );
    
    if (!urlData) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    // Check if it's an AJAX request
    if (req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest') {
      return res.json({ 
        redirect: urlData.original_url,
        visits: urlData.visits
      });
    }
    
    // Regular browser request
    return res.redirect(302, urlData.original_url);
  } catch (err) {
    console.error("Redirect error:", err);
    if (req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest') {
      return res.status(500).json({ error: "Server error" });
    } else {
      return res.status(500).send('<h1>500 - Server Error</h1>');
    }
  }
});

// Admin:// Delete all URLs (admin only)
router.delete("/api/admin/urls", isAdmin, async (req, res) => {
  try {
    const result = await Url.deleteMany({});
    console.log(`Deleted ${result.deletedCount} URLs`);
    res.json({ 
      success: true, 
      message: `Successfully deleted ${result.deletedCount} URLs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all URLs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete all URLs',
      details: error.message
    });
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

// Admin: Delete URL with improved error handling and logging
router.delete("/api/admin/urls/:code", isAdmin, async (req, res) => {
  const { code } = req.params;
  
  // Log the incoming request details
  console.log('Delete request received:', {
    code,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    params: req.params,
    query: req.query
  });

  // Validate the code parameter
  if (!code || code === 'undefined') {
    console.error('Invalid or missing code parameter');
    return res.status(400).json({
      success: false,
      error: 'Invalid URL code',
      deletedCount: 0
    });
  }

  try {
    // First check if the URL exists
    const url = await Url.findOne({ short_code: code });
    if (!url) {
      console.log(`URL with code "${code}" not found`);
      return res.status(404).json({ 
        success: false,
        error: 'URL not found',
        deletedCount: 0
      });
    }
    
    // Delete the URL
    console.log(`Attempting to delete URL with code: "${code}"`);
    const result = await Url.deleteOne({ short_code: code });
    
    if (result.deletedCount === 0) {
      console.error(`Failed to delete URL with code: "${code}"`);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete URL from database',
        deletedCount: 0
      });
    }
    
    console.log(`Successfully deleted URL with code: "${code}"`);
    return res.json({ 
      success: true,
      message: 'URL deleted successfully',
      deletedCount: result.deletedCount,
      short_code: code
    });
    
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Server error during deletion',
      deletedCount: 0
    });
  }
});

module.exports = router;