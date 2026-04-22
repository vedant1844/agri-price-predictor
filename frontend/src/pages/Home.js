import React from 'react';

const features = [
  { icon: '📈', title: 'Price Prediction', desc: 'AI-powered forecasting to predict future crop prices based on historical data and market trends.' },
  { icon: '📊', title: 'Historical Data', desc: 'Access detailed price history and trend analysis for any crop, state and market combination.' },
  { icon: '🏪', title: 'Market Insights', desc: 'Real-time mandi prices and market comparisons across multiple APMC markets in your district.' },
  { icon: '💡', title: 'Farmer Advice', desc: 'Personalized selling recommendations, risk alerts, and optimal market timing guidance.' },
];

const steps = [
  { icon: '🌾', bg: '#e3f2fd', title: '1. Select Your Crop', desc: 'Choose your crop type, state, and market from our comprehensive database covering all of India.' },
  { icon: '📅', bg: '#fff8e1', title: '2. Set Time Period', desc: 'Select the current year and target future year to forecast the price gap over your desired period.' },
  { icon: '✅', bg: '#e8f5e9', title: '3. Get Prediction', desc: 'Receive detailed price forecasts with confidence intervals, charts, and personalized farming advice.' },
];

const stats = [
  { num: '50+', label: 'Crops Covered' },
  { num: '28',  label: 'States & UTs' },
  { num: '7,000+', label: 'APMC Markets' },
  { num: '92%', label: 'Prediction Accuracy' },
];

export default function Home({ navigate }) {
  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(165deg, #1a3a1a 0%, #2d6235 40%, #4a8c52 70%, #3a7d44 100%)',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 2rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* dot pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px' }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 100, padding: '6px 18px', fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.85)', marginBottom: '1.5rem',
          letterSpacing: '0.8px', textTransform: 'uppercase',
          animation: 'fadeUp 0.5s ease forwards',
        }}>
          🌱 AI-Powered Smart Farming
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
          fontWeight: 700, color: 'white', lineHeight: 1.15,
          marginBottom: '1.2rem', maxWidth: 720,
          animation: 'fadeUp 0.5s 0.1s ease forwards', opacity: 0,
        }}>
          Welcome to <span style={{ color: '#f9a825' }}>Smart Farming</span>
        </h1>

        <p style={{
          fontSize: '1.1rem', color: 'rgba(255,255,255,0.75)',
          maxWidth: 560, lineHeight: 1.75, marginBottom: '2.5rem',
          animation: 'fadeUp 0.5s 0.2s ease forwards', opacity: 0,
        }}>
          Your platform for future crop price prediction. We provide farmers with the tools
          to forecast future crop prices and help them make informed decisions.
        </p>

        <div style={{
          display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeUp 0.5s 0.3s ease forwards', opacity: 0,
        }}>
          <button onClick={() => navigate('predict')} style={{
            background: 'white', color: '#2d6235', border: 'none',
            padding: '14px 32px', borderRadius: 50, fontSize: '1rem',
            fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
          onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}>
            Predict Crop Price
          </button>
          <button onClick={() => navigate('history')} style={{
            background: 'transparent', color: 'white',
            border: '1.5px solid rgba(255,255,255,0.5)',
            padding: '14px 32px', borderRadius: 50, fontSize: '1rem',
            fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}>
            View Historical Data
          </button>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#f4f9f4', padding: '5rem 2rem' }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 600, color: '#2d6235', marginBottom: '0.6rem' }}>
          What We Offer
        </h2>
        <p style={{ textAlign: 'center', color: '#4a6b4a', marginBottom: '3rem', fontSize: '1.05rem' }}>
          Powerful tools to help India's farmers make smarter decisions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#3a7d44', padding: '3rem 2rem', display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center', color: 'white' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', fontWeight: 700, display: 'block' }}>{s.num}</span>
            <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 4, display: 'block' }}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section style={{ background: 'white', padding: '5rem 2rem' }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 600, color: '#2d6235', marginBottom: '0.6rem' }}>
          How It Works
        </h2>
        <p style={{ textAlign: 'center', color: '#4a6b4a', marginBottom: '3rem', fontSize: '1.05rem' }}>
          Three simple steps to get crop price predictions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: 820, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 14, padding: '2rem 1.5rem', border: '1px solid rgba(58,125,68,0.12)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, background: s.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 1.2rem' }}>{s.icon}</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a2e1a', marginBottom: '0.5rem' }}>{s.title}</h3>
              <p style={{ fontSize: '0.9rem', color: '#4a6b4a', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', borderRadius: 14, padding: '2rem 1.5rem',
        border: '1px solid rgba(58,125,68,0.12)',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.1)' : '0 2px 12px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.2s ease',
      }}>
      <div style={{ width: 52, height: 52, background: '#e8f5e9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: '1.2rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a2e1a', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', color: '#4a6b4a', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
