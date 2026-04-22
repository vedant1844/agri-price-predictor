import React from 'react';

export default function LoadingOverlay({ message = 'Analyzing market data...' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '2rem 3rem',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width: 48, height: 48,
          border: '4px solid #e8f5e9',
          borderTopColor: '#3a7d44',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem',
        }} />
        <p style={{ color: '#4a6b4a', fontSize: '0.95rem', fontFamily: "'DM Sans', sans-serif" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
