import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: '#1a2e1a',
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
      padding: '1.8rem 2rem',
      fontSize: '0.85rem',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p>
        © 2026 <span style={{ color: '#f9a825', fontWeight: 600 }}>Agrupaiya</span> — Smart Farming Price Predictor
        &nbsp;|&nbsp; Empowering Indian Farmers with AI
      </p>
    </footer>
  );
}
