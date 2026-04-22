import React, { useState } from 'react';

const faqs = [
  { q: 'How accurate are the price predictions?', a: 'Our AI model achieves approximately 89–92% confidence on most major crops. However, predictions can be affected by sudden market changes, policy announcements, or extreme weather events which may not be in the training data.' },
  { q: 'What data sources are used?', a: "We use historical APMC mandi price data from the Government of India's AgMarkNet portal, combined with seasonal and weather trend data to generate forecasts." },
  { q: 'How often is data updated?', a: 'Market Insights data is updated daily from the government API. Historical data is updated monthly, and prediction models are retrained quarterly for best accuracy.' },
  { q: 'Is this service free for farmers?', a: 'Yes, Agrupaiya is completely free for farmers. Our mission is to empower Indian agriculture with technology, so the core prediction features will always remain free.' },
  { q: 'Which crops are currently supported?', a: 'We currently support over 50 crops including Wheat, Rice, Cotton, Sugarcane, Soybean, Onion, Tomato, Potato, Apple, Banana, and Groundnut. We add new crops regularly based on farmer demand.' },
  { q: 'How do I interpret the confidence percentage?', a: 'The confidence percentage indicates how reliable the prediction is based on historical patterns. Above 90% means very reliable; 80–90% is good; below 80% means high uncertainty and you should verify with local mandi rates.' },
];

export default function Help() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 55%, #81c784 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ background: 'rgba(255,255,255,0.93)', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 700, boxShadow: '0 16px 50px rgba(0,0,0,0.12)', backdropFilter: 'blur(8px)' }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', color: '#1565c0', marginBottom: '0.8rem', textAlign: 'center' }}>Help Center</h2>
        <p style={{ textAlign: 'center', color: '#4a6b4a', fontSize: '0.97rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          If you have any questions or need assistance, please feel free to contact us. We are here to help you with any issues or queries you may have — don't hesitate to reach out.
        </p>

        {/* Contact Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#e8f5e9', borderRadius: 12, padding: '1.2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>✉️</span>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#4a6b4a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
              <div style={{ fontSize: '0.93rem', color: '#1a2e1a', fontWeight: 500 }}>
                <a href="mailto:support@agrupaiya.in" style={{ color: '#3a7d44', textDecoration: 'none' }}>support@agrupaiya.in</a>
              </div>
            </div>
          </div>
          <div style={{ background: '#e8f5e9', borderRadius: 12, padding: '1.2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>📞</span>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#4a6b4a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Number</div>
              <div style={{ fontSize: '0.93rem', color: '#1a2e1a', fontWeight: 500 }}>+91 98765 43210</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a2e1a', marginBottom: '1rem' }}>Frequently Asked Questions</h3>
        {faqs.map((faq, i) => (
          <FaqItem key={i} faq={faq} open={openIdx === i} toggle={() => setOpenIdx(openIdx === i ? null : i)} />
        ))}

        {/* Bottom note */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f1f8f1', borderRadius: 10, fontSize: '0.85rem', color: '#4a6b4a', textAlign: 'center' }}>
          💬 Still need help? Email us and we'll get back to you within 24 hours.
        </div>
      </div>
    </div>
  );
}

function FaqItem({ faq, open, toggle }) {
  return (
    <div style={{ border: '1px solid rgba(58,125,68,0.15)', borderRadius: 10, marginBottom: '0.8rem', overflow: 'hidden' }}>
      <button onClick={toggle} style={{ width: '100%', padding: '1rem 1.2rem', fontSize: '0.92rem', fontWeight: 500, color: open ? '#2d6235' : '#1a2e1a', background: open ? '#e8f5e9' : 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'DM Sans',sans-serif", textAlign: 'left', transition: 'background 0.2s' }}>
        {faq.q}
        <span style={{ fontSize: '1.2rem', color: '#3a7d44', flexShrink: 0, marginLeft: 8, fontWeight: 300 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0.1rem 1.2rem 1rem', fontSize: '0.87rem', color: '#4a6b4a', background: 'white', lineHeight: 1.65 }}>
          {faq.a}
        </div>
      )}
    </div>
  );
}
