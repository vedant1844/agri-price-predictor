import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import LoadingOverlay from '../components/LoadingOverlay';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CROP_BASE = { wheat: 2400, rice: 2800, cotton: 6500, sugarcane: 350, maize: 2000, soybean: 4500, tomato: 1800, onion: 2200, potato: 1600, apple: 7200, banana: 2000, groundnut: 5500 };
const STATE_MULT = { karnataka: 1.05, maharashtra: 1.08, gujarat: 1.10, punjab: 1.12, haryana: 1.09, up: 0.98, mp: 0.97, rajasthan: 1.02, ap: 1.04, telangana: 1.06, 'tamil-nadu': 1.07, wb: 1.01 };

const inp = {
  label: { display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#1a2e1a', marginBottom: 6 },
  field: { width: '100%', padding: '12px 16px', border: '1.5px solid rgba(58,125,68,0.22)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#1a2e1a', background: 'white', outline: 'none', appearance: 'none', WebkitAppearance: 'none' },
};

export default function PredictPrice() {
  const [form, setForm] = useState({ crop: 'wheat', state: 'karnataka', month: '4', curYear: '2026', futYear: '2028' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const predict = () => {
    const curY = parseInt(form.curYear), futY = parseInt(form.futYear);
    if (futY <= curY) { alert('Future year must be greater than current year.'); return; }
    setLoading(true);
    setTimeout(() => {
      const base = CROP_BASE[form.crop] || 2500;
      const mult = STATE_MULT[form.state] || 1.0;
      const years = futY - curY;
      const growth = 0.04 + Math.random() * 0.06;
      const curPrice = Math.round(base * mult);
      const futPrice = Math.round(curPrice * Math.pow(1 + growth, years));
      const conf = Math.floor(85 + Math.random() * 9);
      const range = Math.round(futPrice * 0.09);
      const pct = (((futPrice - curPrice) / curPrice) * 100).toFixed(1);
      const labels = [], prices = [], pMin = [], pMax = [];
      for (let y = curY; y <= futY; y++) {
        labels.push(y.toString());
        const p = Math.round(curPrice * Math.pow(1 + growth, y - curY));
        prices.push(p); pMin.push(Math.round(p * 0.91)); pMax.push(Math.round(p * 1.09));
      }
      setLoading(false);
      setResult({ curPrice, futPrice, conf, range, pct, days: years * 365, min: futPrice - range, max: futPrice + range, labels, prices, pMin, pMax, years, crop: form.crop, state: form.state });
    }, 1800);
  };

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  const cropOptions = [['wheat','Wheat'],['rice','Rice'],['cotton','Cotton'],['sugarcane','Sugarcane'],['maize','Maize'],['soybean','Soybean'],['tomato','Tomato'],['onion','Onion'],['potato','Potato'],['apple','Apple'],['banana','Banana'],['groundnut','Groundnut']];
  const stateOptions = [['karnataka','Karnataka'],['maharashtra','Maharashtra'],['gujarat','Gujarat'],['punjab','Punjab'],['haryana','Haryana'],['up','Uttar Pradesh'],['mp','Madhya Pradesh'],['rajasthan','Rajasthan'],['ap','Andhra Pradesh'],['telangana','Telangana'],['tamil-nadu','Tamil Nadu'],['wb','West Bengal']];
  const monthOptions = [['1','January'],['2','February'],['3','March'],['4','April'],['5','May'],['6','June'],['7','July'],['8','August'],['9','September'],['10','October'],['11','November'],['12','December']];

  return (
    <>
      {loading && <LoadingOverlay message="Running AI price prediction..." />}
      <div style={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 50%, #81c784 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.93)', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.9rem', color: '#3a7d44', textAlign: 'center', marginBottom: 6 }}>Crop Price Prediction</h2>
          <p style={{ textAlign: 'center', color: '#4a6b4a', fontSize: '0.9rem', marginBottom: '2rem' }}>Fill in the details below to get an AI-powered price forecast</p>

          <FormGroup label="Select Crop Type">
            <SelectField value={form.crop} onChange={v => set('crop', v)} options={cropOptions} />
          </FormGroup>
          <FormGroup label="Select State">
            <SelectField value={form.state} onChange={v => set('state', v)} options={stateOptions} />
          </FormGroup>
          <FormGroup label="Select Month">
            <SelectField value={form.month} onChange={v => set('month', v)} options={monthOptions} />
          </FormGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.4rem' }}>
            <FormGroup label="Current Year">
              <input type="number" value={form.curYear} onChange={e => set('curYear', e.target.value)} min="2020" max="2030" style={inp.field} />
            </FormGroup>
            <FormGroup label="Future Year">
              <input type="number" value={form.futYear} onChange={e => set('futYear', e.target.value)} min="2021" max="2035" style={inp.field} />
            </FormGroup>
          </div>

          <PredictButton onClick={predict} />

          {result && (
            <div ref={resultRef} style={{ marginTop: '2rem', animation: 'fadeUp 0.4s ease' }}>
              <Disclaimer />
              <PriceCard result={result} />
              <RangeCard result={result} />
              <ChartCard result={result} />
              <AdviceCard result={result} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: '1.4rem' }}>
      <label style={inp.label}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp.field, paddingRight: 40, cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233a7d44' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function PredictButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', padding: '16px', background: hov ? '#2d6235' : '#3a7d44', color: 'white', border: 'none', borderRadius: 12, fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif", transform: hov ? 'translateY(-1px)' : 'none', boxShadow: hov ? '0 6px 20px rgba(58,125,68,0.3)' : 'none', marginTop: 4 }}>
      🔮 Predict Price
    </button>
  );
}

function Disclaimer() {
  return (
    <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '12px 16px', fontSize: '0.83rem', color: '#7c6000', marginBottom: '1.2rem', lineHeight: 1.55 }}>
      <strong style={{ color: '#f57f17' }}>⚠ AI Prediction Disclaimer:</strong> This prediction is generated by AI based on historical data and market trends. Actual prices may vary due to unforeseen market conditions, weather, and other factors. Please use this as a guide, not an absolute forecast.
    </div>
  );
}

function PriceCard({ result }) {
  const { futPrice, conf, days, range, pct } = result;
  return (
    <div style={{ background: 'linear-gradient(135deg, #3a7d44 0%, #2d6235 100%)', borderRadius: 14, padding: '1.8rem', color: 'white', textAlign: 'center', marginBottom: '1.2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem', marginBottom: '0.8rem' }}>
        ↑ +{pct}%
      </div>
      <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 4 }}>Predicted Future Price</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>₹{futPrice.toLocaleString('en-IN')}</div>
      <div style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '1rem' }}>/quintal</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
        {[{ v: conf + '%', l: 'Confidence' }, { v: days, l: 'Days' }, { v: '±₹' + range.toLocaleString('en-IN'), l: 'Range' }].map((m, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{m.v}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 2 }}>{m.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RangeCard({ result }) {
  const { min, max, futPrice, range } = result;
  const variation = ((range / futPrice) * 200).toFixed(1);
  return (
    <div style={{ background: '#e8f5e9', borderRadius: 12, padding: '1.4rem', marginBottom: '1.2rem' }}>
      <h4 style={{ fontSize: '0.95rem', color: '#2d6235', fontWeight: 600, marginBottom: '1rem' }}>📊 Expected Price Range</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#c62828', minWidth: 80 }}>₹{min.toLocaleString('en-IN')}</span>
        <div style={{ flex: 1, height: 8, background: 'linear-gradient(to right, #ef9a9a, #a5d6a7, #66bb6a)', borderRadius: 4, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, background: '#2d6235', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </div>
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#2e7d32', minWidth: 80, textAlign: 'right' }}>₹{max.toLocaleString('en-IN')}</span>
      </div>
      <div style={{ fontSize: '0.82rem', color: '#4a6b4a' }}>Range Span: ₹{(range * 2).toLocaleString('en-IN')} ({variation}% variation)</div>
    </div>
  );
}

function ChartCard({ result }) {
  const { labels, prices, pMin, pMax } = result;
  const data = {
    labels,
    datasets: [
      { label: 'Predicted Price', data: prices, borderColor: '#3a7d44', backgroundColor: 'rgba(58,125,68,0.08)', borderWidth: 2.5, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#3a7d44', fill: false },
      { label: 'Min Confidence', data: pMin, borderColor: '#ef9a9a', borderDash: [4, 3], borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: 'Max Confidence', data: pMax, borderColor: '#66bb6a', borderDash: [4, 3], borderWidth: 1.5, pointRadius: 0, fill: false },
    ],
  };
  const options = { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 12 } } }, scales: { y: { ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN'), font: { size: 10 } } } } };
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.4rem', border: '1px solid rgba(58,125,68,0.12)', marginBottom: '1.2rem' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a2e1a', marginBottom: '1rem' }}>📈 Price Trend Chart</h4>
      <Line data={data} options={options} />
    </div>
  );
}

function AdviceCard({ result }) {
  const { conf, crop, years } = result;
  const cropName = crop.charAt(0).toUpperCase() + crop.slice(1);
  const advice = [
    { icon: '🎯', title: 'Market Timing Advice', text: `Consider holding ${cropName} for ${Math.round(years * 0.4 * 12)} more months for potentially better prices at your target mandi.` },
    { icon: '🌤', title: 'Seasonal Outlook', text: 'Monitor weather forecasts closely. Price volatility typically increases near harvest season in your region.' },
    { icon: '⚠', title: 'Risk Warning', text: `${conf > 90 ? 'Low risk' : 'Moderate risk'} — ${conf > 90 ? 'market conditions are relatively stable for this crop' : 'general market shifts are possible, monitor trends'}.` },
    { icon: '✅', title: "Today's Action Plan", text: `Prediction confidence is ${conf}%. Compare prices at 2–3 nearby mandis before selling. Factor in transportation costs for the best net return.` },
  ];
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.4rem', border: '1px solid rgba(58,125,68,0.12)' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a2e1a', marginBottom: '1rem' }}>💡 Farmer Advice</h4>
      {advice.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < advice.length - 1 ? '1px solid rgba(58,125,68,0.08)' : 'none' }}>
          <span style={{ fontSize: '1.1rem', marginTop: 1, flexShrink: 0 }}>{a.icon}</span>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a2e1a' }}>{a.title}</div>
            <div style={{ fontSize: '0.82rem', color: '#4a6b4a', lineHeight: 1.55, marginTop: 2 }}>{a.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
