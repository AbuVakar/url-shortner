import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { FiLink, FiExternalLink, FiCopy, FiUser, FiArrowRight } from 'react-icons/fi';
import { API_URL, getAxiosConfig } from './config';
import './App.css';
import AdminPage from './pages/AdminPage';

function App() {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [recentUrls, setRecentUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Load recent URLs from localStorage
  useEffect(() => {
    const savedUrls = localStorage.getItem('recentUrls');
    if (savedUrls) {
      setRecentUrls(JSON.parse(savedUrls));
    }
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShortUrl('');
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Add https:// if not present
    const processedUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/api/shorten`,
        { original_url: processedUrl },
        getAxiosConfig()
      );
      
      const newShortUrl = res.data.short_url;
      setShortUrl(newShortUrl);
      
      // Add to recent URLs
      const updatedUrls = [
        { original: processedUrl, short: newShortUrl, date: new Date().toISOString() },
        ...recentUrls.slice(0, 4) // Keep only 5 most recent
      ];
      setRecentUrls(updatedUrls);
      localStorage.setItem('recentUrls', JSON.stringify(updatedUrls));
      
    } catch (err) {
      setError(
        err?.response?.data?.error || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="App" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        {/* Navigation */}
        <nav style={{ 
          backgroundColor: 'white', 
          padding: '0.4rem 1rem', 
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Link to="/" style={{ 
              textDecoration: 'none', 
              color: '#1e40af', 
              fontWeight: '600', 
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              lineHeight: '1.2'
            }}>
              <FiLink /> <b>Link Shrink</b> - <i>URL Shortner</i>
            </Link>
            <Link to="/admin" style={{ 
              textDecoration: 'none', 
              color: '#4b5563',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              transition: 'all 0.2s',
              ':hover': {
                backgroundColor: '#f3f4f6'
              }
            }}>
              <FiUser size={18} /> <b>Admin</b>
            </Link>
          </div>
        </nav>

        <main style={{
          maxWidth: '800px',
          margin: '0.8rem auto',
          padding: '0 0.8rem',
          minHeight: 'calc(100vh - 200px)'
        }}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/" element={
              <>
                {/* Hero Section */}
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: '2rem',
                  padding: '0 1rem'
                }}>
                  <h2 style={{
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    margin: '0.5rem 0',
                    textAlign: 'center'
                  }}>
                    Shorten Your Links
                  </h2>
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    margin: '0.5rem 0 1rem',
                    textAlign: 'center',
                    lineHeight: '1.4'
                  }}>
                    Create short, memorable links in seconds. Perfect for social media, emails, and more.
                  </p>
                </div>

                {/* URL Shortener Form */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0,0.05)'
                }}>
                  <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.75rem',
                      flexDirection: 'column',
                      '@media (min-width: 640px)': {
                        flexDirection: 'row'
                      }
                    }}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                          type="url"
                          placeholder="Paste your long URL here..."
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          style={{ 
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            transition: 'all 0.2s',
                            ':focus': {
                              outline: 'none',
                              borderColor: '#93c5fd',
                              boxShadow: '0 0 0 3px rgba(147, 197, 253, 0.5)'
                            }
                          }}
                          required
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                          backgroundColor: loading ? '#93c5fd' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          ':hover:not(:disabled)': {
                            backgroundColor: '#2563eb'
                          },
                          ':active:not(:disabled)': {
                            transform: 'translateY(1px)'
                          }
                        }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner"></span> Shortening...
                          </>
                        ) : (
                          <>
                            <FiLink size={18} /> Shorten URL
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {error && (
                    <div style={{ 
                      marginTop: '1rem',
                      padding: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  )}

                  {shortUrl && (
                    <div style={{ 
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '0.5rem',
                      border: '1px solid #bae6fd',
                      animation: 'fadeIn 0.3s ease-out'
                    }}>
                      <div style={{ 
                        color: '#0369a1',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FiLink size={18} /> Your Short URL:
                      </div>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <a 
                          href={shortUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#0284c7',
                            textDecoration: 'none',
                            fontWeight: '500',
                            wordBreak: 'break-all',
                            ':hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {shortUrl}
                        </a>
                        <button
                          onClick={() => copyToClipboard(shortUrl)}
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: 'none',
                            borderRadius: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s',
                            ':hover': {
                              backgroundColor: '#bae6fd'
                            }
                          }}
                          title="Copy to clipboard"
                        >
                          <FiCopy size={14} />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent URLs Section */}
                {recentUrls.length > 0 && (
                  <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.75rem', 
                    padding: '1.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}>
                    <h1 style={{ 
                      margin: 0, 
                      fontSize: '1.25rem', 
                      fontWeight: '600',
                      color: '#1e293b',
                      lineHeight: '1.5'
                    }}>
                      Link Shrink
                    </h1>
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      {recentUrls.map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            alignItems: 'center'
                          }}>
                            <a 
                              href={item.short} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                ':hover': {
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              {item.short.split('//')[1]}
                              <FiExternalLink size={14} />
                            </a>
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.5rem',
                              fontSize: '0.875rem'
                            }}>
                              <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div style={{
                            color: '#64748b',
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <FiArrowRight size={12} />
                            <span title={item.original}>
                              {item.original.length > 60 
                                ? item.original.substring(0, 57) + '...' 
                                : item.original}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            } />
          </Routes>
        </main>

        <footer style={{
          marginTop: '4rem',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p>© {new Date().getFullYear()} Link Shrink . All rights reserved.</p>
          <p>Made with❣️ by <a href="https://github.com/abuvakar">Abu Vakar</a></p>
        </footer>
      </div>

      <style>{
        `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        `
      }</style>
    </Router>
  );
}

export default App;
