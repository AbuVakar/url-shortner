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

// Create short URL
router.post("/api/shorten", async (req, res) => {
  const { original_url } = req.body;
  if (!original_url) return res.status(400).json({ error: "URL is required" });

  const short_code = nanoid(6);
  const newUrl = new Url({ original_url, short_code });
  await newUrl.save();

  // Use environment variable for base URL or fallback to request origin
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ 
    short_url: `${baseUrl}/${short_code}`,
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
      return res.redirect(urlData.original_url);
    } else {
      return res.status(404).json({ error: "URL not found" });
    }
  } catch (err) {
    console.error("Redirect error:", err);
    return res.status(500).json({ error: "Server error" });
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

// Admin: Delete a URL
router.delete("/api/admin/urls/:short_code", isAdmin, async (req, res) => {
  try {
    const { short_code } = req.params;
    const result = await Url.findOneAndDelete({ short_code });
    
    if (!result) {
      return res.status(404).json({ error: "URL not found" });
    }
    
    res.json({ message: "URL deleted successfully" });
  } catch (err) {
    console.error("Error deleting URL:", err);
    res.status(500).json({ error: "Failed to delete URL" });
  }
});

module.exports = router;