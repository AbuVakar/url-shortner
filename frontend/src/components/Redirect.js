import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

// Cache for storing redirect URLs to prevent multiple lookups
const redirectCache = new Map();

const Redirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const redirectToOriginalUrl = useCallback(async (shortCode) => {
    // Check cache first
    if (redirectCache.has(shortCode)) {
      window.location.href = redirectCache.get(shortCode);
      return;
    }

    try {
      setIsRedirecting(true);
      
      // Use a HEAD request first to check if the URL exists (faster than GET)
      try {
        await axios.head(`${API_URL}/${shortCode}`, { 
          timeout: 3000, // 3 second timeout
          maxRedirects: 0, // Don't follow redirects
          validateStatus: (status) => status >= 200 && status < 400 // Consider 3xx as success
        });
        
        // If HEAD request succeeds, do the actual redirect
        const finalUrl = `${API_URL}/${shortCode}`;
        redirectCache.set(shortCode, finalUrl);
        window.location.href = finalUrl;
      } catch (headError) {
        // If HEAD fails (e.g., CORS), fall back to GET
        if (headError.response && headError.response.status === 404) {
          throw new Error('URL not found');
        }
        
        // Fall back to GET if HEAD fails for other reasons
        const finalUrl = `${API_URL}/${shortCode}`;
        redirectCache.set(shortCode, finalUrl);
        window.location.href = finalUrl;
      }
    } catch (err) {
      console.error('Redirect error:', err);
      setError('Failed to redirect. The link might be invalid or expired.');
      setIsRedirecting(false);
    }
  }, []);

  useEffect(() => {
    if (code) {
      redirectToOriginalUrl(code);
    } else {
      setError('No short code provided');
    }
  }, [code, redirectToOriginalUrl]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h2>Redirecting...</h2>
      <p>Please wait while we take you to your destination.</p>
    </div>
  );
};

export default Redirect;
