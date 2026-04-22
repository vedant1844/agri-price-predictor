import React, { useState } from 'react';

const NAV_LINKS = [
  { id: 'home',    label: 'Home' },
  { id: 'predict', label: 'Predict Price' },
  { id: 'history', label: 'Historical Data' },
  { id: 'market',  label: 'Market Insights' },
  { id: 'help',    label: 'Help' },
];

const styles = {
  nav: {
    background: '#3a7d44',
    padding: '0 2.5rem',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
  },
  brand: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'white',
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
  links: {
    display: 'flex',
    gap: '0.3rem',
    alignItems: 'center',
  },
  link: {
    color: 'rgba(255,255,255,0.82)',
    background: 'none',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: '0.92rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.18s',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.2px',
  },
  linkActive: {
    color: 'white',
    background: 'rgba(255,255,255,0.18)',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
};

export default function Navbar({ activePage, navigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.brand} onClick={() => navigate('home')}>🌾 Agrupaiya</div>

        {/* Desktop links */}
        <div style={{ ...styles.links, '@media(max-width:768px)': { display: 'none' } }}>
          {NAV_LINKS.map(link => (
            <button
              key={link.id}
              style={activePage === link.id ? { ...styles.link, ...styles.linkActive } : styles.link}
              onClick={() => { navigate(link.id); setMenuOpen(false); }}
              onMouseEnter={e => { if (activePage !== link.id) e.target.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if (activePage !== link.id) e.target.style.background = 'none'; }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#2d6235', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_LINKS.map(link => (
            <button
              key={link.id}
              style={{ ...styles.link, color: activePage === link.id ? 'white' : 'rgba(255,255,255,0.8)', textAlign: 'left' }}
              onClick={() => { navigate(link.id); setMenuOpen(false); }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
