import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { FiExternalLink, FiTrash2, FiLogOut, FiRefreshCw } from 'react-icons/fi';
import { API_URL, getAxiosConfig } from '../config';

const AdminPage = () => {
  // State management
  const [urls, setUrls] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false); // Separate state for login loading
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdminAuthenticated');
    setIsAuthenticated(false);
    setUrls([]);
    setCurrentPage(1);
    setError('');
  }, []);

  // Fetch URLs data with caching
  const fetchData = useCallback(async () => {
    // Don't show loading if we're just refreshing in the background
    if (urls.length === 0) {
      setLoading(true);
    }
    
    setError('');
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/urls`,
        getAxiosConfig(token)
      );
      
      console.log('Fetched URLs:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('First URL object structure:', response.data[0]);
        console.log('Available keys in URL object:', Object.keys(response.data[0]));
      }
      setUrls(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching URLs:', err);
      setError(err.response?.data?.message || 'Failed to load URLs');
      
      // If unauthorized, log the user out
      if (err.response?.status === 401) {
        handleLogout();
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  // Handle login
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the admin password');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/admin/login`,
        { password },
        { timeout: 5000 } // Add timeout to prevent hanging
      );
      
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('isAdminAuthenticated', 'true');
        setIsAuthenticated(true);
        // Don't wait for fetchData to complete before showing the UI
        fetchData().finally(() => setLoading(false));
      } else {
        setError(response.data.error || 'Login failed');
        setLoginLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.code === 'ECONNABORTED' 
          ? 'Request timed out. Please try again.' 
          : (err.response?.data?.error || 'Failed to login')
      );
      setLoginLoading(false);
    }
  };

  // Handle URL deletion with optimistic updates and proper error handling
  const handleDelete = useCallback(async (url) => {
    // Make sure we have a valid URL object with short_code
    if (!url || !url.short_code) {
      console.error('Invalid URL object or missing short_code:', url);
      setError('Invalid URL data. Please refresh the page and try again.');
      return;
    }

    const shortCode = url.short_code;
    console.log('Delete button clicked for URL:', { shortCode, url });

    if (!window.confirm(`Are you sure you want to delete the URL: ${url.original_url}?`)) {
      return;
    }
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('Your session has expired. Please log in again.');
      handleLogout();
      return;
    }
    
    // Store the current URLs in case we need to revert
    const previousUrls = [...urls];
    
    // Optimistic update: Remove the item from UI immediately
    setUrls(prevUrls => {
      const newUrls = prevUrls.filter(u => u.short_code !== shortCode);
      // If we're on the last page with one item, go to previous page
      if (newUrls.length % itemsPerPage === 0 && currentPage > 1) {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
      return newUrls;
    });
    
    try {
      const response = await axios.delete(
        `${API_URL}/api/admin/urls/${encodeURIComponent(shortCode)}`,
        getAxiosConfig(token)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete URL');
      }
      
      console.log('Successfully deleted URL:', response.data);
      
    } catch (err) {
      console.error('Error deleting URL:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
      
      // Revert the optimistic update
      setUrls(previousUrls);
      
      // Show error message
      let errorMessage = 'Failed to delete URL. ';
      
      if (err.response) {
        // Server responded with an error status code
        if (err.response.status === 401) {
          errorMessage += 'Your session has expired. ';
          handleLogout();
        } else if (err.response.status === 404) {
          errorMessage += 'The URL was not found. It may have already been deleted.';
        } else if (err.response.data?.error) {
          errorMessage += err.response.data.error;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage += 'No response from server. Please check your connection.';
      } else {
        // Something else went wrong
        errorMessage += err.message || 'An unknown error occurred.';
      }
      
      setError(errorMessage);
    }
  }, [currentPage, itemsPerPage, urls, handleLogout]);

  // Tooltip component
  const Tooltip = ({ text, children }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <div 
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {showTooltip && (
          <span style={styles.tooltipText}>
            {text}
          </span>
        )}
      </div>
    );
  };

  // Handle URL deletion is already defined above with useCallback

  // Format date
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = urls.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(urls.length / itemsPerPage);

  // Login form
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginContainer}>
          <h2>Admin Login</h2>
          {error && <div style={styles.errorBox}><p>{error}</p></div>}
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.formGroup}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="new-password"
                required
                style={styles.input}
              />
            </div>
            <button 
              type="submit" 
              disabled={loginLoading}
              style={{
                ...styles.primaryButton,
                opacity: loginLoading ? 0.7 : 1,
                cursor: loginLoading ? 'wait' : 'pointer'
              }}
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>URL Shortener Admin</h2>
        <div style={styles.headerActions}>
          <Tooltip text="Refresh">
            <button 
              onClick={fetchData} 
              disabled={loading}
              style={styles.iconButton}
            >
              <FiRefreshCw size={20} />
            </button>
          </Tooltip>
          <Tooltip text="Logout">
            <button 
              onClick={handleLogout}
              style={{ ...styles.iconButton, marginLeft: '10px' }}
            >
              <FiLogOut size={20} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3>Total URLs</h3>
          <p style={styles.statNumber}>{urls.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Total Visits</h3>
          <p style={styles.statNumber}>
            {urls.reduce((total, url) => total + (url.visits || 0), 0)}
          </p>
        </div>
        <div style={styles.statCard}>
          <h3>Avg. Visits</h3>
          <p style={styles.statNumber}>
            {urls.length > 0 
              ? Math.round(urls.reduce((total, url) => total + (url.visits || 0), 0) / urls.length) 
              : 0}
          </p>
        </div>
      </div>

      {/* URL Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>
            <p>Loading URLs...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <p>{error}</p>
            <button 
              onClick={fetchData}
              style={styles.retryButton}
            >
              Retry
            </button>
          </div>
        ) : urls.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No URLs found. Start by creating your first short URL.</p>
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '20%' }}>Short URL</th>
                  <th style={{ ...styles.th, width: '50%' }}>Original URL</th>
                  <th style={{ ...styles.th, width: '10%', textAlign: 'right' }}>Visits</th>
                  <th style={{ ...styles.th, width: '12%' }}>Created</th>
                  <th style={{ ...styles.th, width: '8%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((url) => (
                  <tr key={url._id} style={styles.tr}>
                    <td style={styles.td}>
                      <a 
                        href={`${API_URL}/${url.short_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        {`${API_URL}/${url.short_code}`}
                        <FiExternalLink size={14} style={{ marginLeft: '4px' }} />
                      </a>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.originalUrl} title={url.original_url}>
                        {url.original_url && url.original_url.length > 50 
                          ? `${url.original_url.substring(0, 47)}...` 
                          : url.original_url}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {url.visits || 0}
                    </td>
                    <td style={styles.td}>
                      {formatDate(url.created_at || url.createdAt || url.date_created)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }} key={`actions-${url.short_code}`}>
                      <button
                        onClick={() => handleDelete(url)}
                        style={{ ...styles.iconButton, color: '#EF4444' }}
                        title="Delete URL"
                        key={`delete-${url.short_code}`}
                        aria-label={`Delete ${url.short_code}`}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={styles.paginationButton}
                >
                  Previous
                </button>
                <span style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    width: '100%',
    maxWidth: '100%',
    margin: '0',
    padding: '10px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '8px 0 0',
    color: '#1F2937',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    tableLayout: 'fixed',
    wordWrap: 'break-word',
    fontSize: '14px',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'left',
    backgroundColor: '#F9FAFB',
    color: '#374151',
    fontWeight: '600',
    fontSize: '14px',
    borderBottom: '1px solid #E5E7EB',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #E5E7EB',
    fontSize: '14px',
    color: '#1F2937',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    lineHeight: '1.4',
  },
  tr: {
    '&:hover': {
      backgroundColor: '#F9FAFB',
    },
  },
  link: {
    color: '#3B82F6',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    wordBreak: 'break-all',
    lineHeight: '1.4',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  originalUrl: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    '&:hover': {
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    },
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    borderTop: '1px solid #E5E7EB',
  },
  paginationButton: {
    padding: '8px 16px',
    margin: '0 8px',
    backgroundColor: '#F3F4F6',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    cursor: 'pointer',
    '&:hover:not(:disabled)': {
      backgroundColor: '#E5E7EB',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  pageInfo: {
    margin: '0 16px',
    color: '#6B7280',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    color: '#4B5563',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    '&:hover': {
      backgroundColor: '#F3F4F6',
    },
  },
  tooltipText: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#374151',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 1000,
    marginBottom: '5px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  actionCell: {
    whiteSpace: 'nowrap',
    width: '120px',
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#4F46E5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    '&:hover': {
      backgroundColor: '#4338CA',
    },
    '&:disabled': {
      opacity: 0.7,
      cursor: 'not-allowed',
    },
  },
  loginContainer: {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '32px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  loginForm: {
    marginTop: '24px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    '&:focus': {
      outline: 'none',
      borderColor: '#4F46E5',
      boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.2)',
    },
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  retryButton: {
    marginTop: '8px',
    padding: '6px 12px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#B91C1C',
    },
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6B7280',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#6B7280',
  },
};

export default AdminPage;
