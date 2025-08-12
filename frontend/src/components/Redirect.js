import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const Redirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const redirectToOriginalUrl = async () => {
      try {
        // This will trigger the backend's redirect logic
        window.location.href = `${API_URL}/${code}`;
      } catch (err) {
        console.error('Redirect error:', err);
        setError('Failed to redirect. The link might be invalid or expired.');
      }
    };

    if (code) {
      redirectToOriginalUrl();
    } else {
      setError('No short code provided');
    }
  }, [code]);

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
