import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchPrediction, fetchCommodities, fetchStates } from '../api';
import { jsPDF } from 'jspdf';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Fallback defaults (used ONLY if backend is unreachable)
const CROP_BASE = { wheat: 2400, rice: 2800, cotton: 6500, sugarcane: 350, maize: 2000, soybean: 4500, tomato: 1800, onion: 2200, potato: 1600, apple: 7200, banana: 2000, groundnut: 5500 };
const STATE_MULT = { karnataka: 1.05, maharashtra: 1.08, gujarat: 1.10, punjab: 1.12, haryana: 1.09, up: 0.98, mp: 0.97, rajasthan: 1.02, ap: 1.04, telangana: 1.06, 'tamil-nadu': 1.07, wb: 1.01 };

// Hardcoded fallbacks in case the API is unreachable
const FALLBACK_CROPS = [['Wheat','Wheat'],['Rice','Rice'],['Cotton','Cotton'],['Sugarcane','Sugarcane'],['Maize','Maize'],['Soyabean','Soyabean'],['Tomato','Tomato'],['Onion','Onion'],['Potato','Potato'],['Apple','Apple'],['Banana','Banana'],['Groundnut','Groundnut']];
const FALLBACK_STATES = [['Karnataka','Karnataka'],['Maharashtra','Maharashtra'],['Gujarat','Gujarat'],['Punjab','Punjab'],['Haryana','Haryana'],['Uttar Pradesh','Uttar Pradesh'],['Madhya Pradesh','Madhya Pradesh'],['Rajasthan','Rajasthan'],['Andhra Pradesh','Andhra Pradesh'],['Telangana','Telangana'],['Tamil Nadu','Tamil Nadu'],['West Bengal','West Bengal']];

const inp = {
  label: { display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#1a2e1a', marginBottom: 6 },
  field: { width: '100%', padding: '12px 16px', border: '1.5px solid rgba(58,125,68,0.22)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#1a2e1a', background: 'white', outline: 'none', appearance: 'none', WebkitAppearance: 'none' },
};

// Helper: get default prediction date (6 months from now)
function getDefaultDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
}
function getToday() { return new Date().toISOString().split('T')[0]; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PredictPrice() {
  const [form, setForm] = useState({ crop: '', state: '', predictionDate: getDefaultDate() });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cropOptions, setCropOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const resultRef = useRef(null);

  useEffect(() => {
    async function loadOptions() {
      setOptionsLoading(true);
      try {
        const [commoditiesRes, statesRes] = await Promise.all([fetchCommodities(), fetchStates()]);
        const dbCrops = (commoditiesRes.commodities || []).map(c => [c, c]);
        const dbStates = (statesRes.states || []).map(s => [s, s]);
        setCropOptions(dbCrops.length > 0 ? dbCrops : FALLBACK_CROPS);
        setStateOptions(dbStates.length > 0 ? dbStates : FALLBACK_STATES);
        if (dbCrops.length > 0) setForm(p => ({ ...p, crop: p.crop || dbCrops[0][0] }));
        if (dbStates.length > 0) setForm(p => ({ ...p, state: p.state || dbStates[0][0] }));
      } catch (err) {
        setCropOptions(FALLBACK_CROPS);
        setStateOptions(FALLBACK_STATES);
        setForm(p => ({ ...p, crop: p.crop || 'Wheat', state: p.state || 'Karnataka' }));
      } finally { setOptionsLoading(false); }
    }
    loadOptions();
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Derive month/year from the selected prediction date
  const parsedDate = new Date(form.predictionDate + 'T00:00:00');
  const futMonth = parsedDate.getMonth() + 1;
  const futYear = parsedDate.getFullYear();
  const curYear = new Date().getFullYear();

  const predict = async () => {
    if (futYear < curYear) { alert('Please select a future date.'); return; }
    if (futYear === curYear && futMonth <= new Date().getMonth() + 1) { alert('Please select a future date.'); return; }

    setLoading(true);
    setError(null);
    const effectiveFutYear = Math.max(futYear, curYear + 1);

    try {
      const data = await fetchPrediction({
        commodity: form.crop, state: form.state,
        month: futMonth, currentYear: curYear, futureYear: effectiveFutYear,
      });
      const years = effectiveFutYear - curYear;
      setResult({
        curPrice: data.current_price, futPrice: data.future_price,
        conf: data.confidence, range: data.price_range, pct: data.pct_change,
        days: data.days, min: data.min_price, max: data.max_price,
        labels: data.chart?.labels || [], prices: data.chart?.prices || [],
        pMin: data.chart?.p_min || [], pMax: data.chart?.p_max || [],
        years, crop: form.crop, state: form.state,
        predictionDate: form.predictionDate,
        modelType: data.model_type, growthRate: data.growth_rate, advice: data.advice,
      });
    } catch (err) {
      setError('Server is waking up... Using offline estimation. Try again in 30s.');
      const cropKey = form.crop.toLowerCase();
      const base = CROP_BASE[cropKey] || 2500;
      const mult = STATE_MULT[form.state.toLowerCase()] || 1.0;
      const years = effectiveFutYear - curYear;
      const growth = 0.04 + Math.random() * 0.06;
      const curPrice = Math.round(base * mult);
      const futPrice = Math.round(curPrice * Math.pow(1 + growth, years));
      const conf = Math.floor(75 + Math.random() * 5);
      const range = Math.round(futPrice * 0.12);
      const pct = (((futPrice - curPrice) / curPrice) * 100).toFixed(1);
      const labels = [], prices = [], pMin = [], pMax = [];
      for (let y = curYear; y <= effectiveFutYear; y++) {
        labels.push(y.toString());
        const p = Math.round(curPrice * Math.pow(1 + growth, y - curYear));
        prices.push(p); pMin.push(Math.round(p * 0.91)); pMax.push(Math.round(p * 1.09));
      }
      setResult({ curPrice, futPrice, conf, range, pct, days: years * 365, min: futPrice - range, max: futPrice + range, labels, prices, pMin, pMax, years, crop: form.crop, state: form.state, predictionDate: form.predictionDate, modelType: 'offline_fallback', growthRate: (growth * 100).toFixed(1), advice: null });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  // ── PDF Report Generator ──
  const downloadPDF = () => {
    if (!result) { alert('No prediction result to download.'); return; }
    try {
      const doc = new jsPDF();
      const pd = new Date(result.predictionDate + 'T00:00:00');
      const dateStr = pd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const fmt = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-IN');

      // ── Green Header ──
      doc.setFillColor(58, 125, 68);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Crop Price Prediction Report', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated on ' + now + '  |  AI-Powered Forecast', 105, 32, { align: 'center' });

      let y = 55;

      // ── Prediction Summary ──
      doc.setTextColor(26, 46, 26);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Prediction Summary', 14, y);
      doc.setDrawColor(58, 125, 68);
      doc.setLineWidth(0.5);
      doc.line(14, y + 3, 196, y + 3);
      y += 12;

      const modelLabel = result.modelType === 'hybrid_arima_xgboost' ? 'Hybrid ARIMA + XGBoost'
        : result.modelType === 'statistical_fallback' ? 'Statistical Estimation' : 'Offline Estimation';

      const summaryRows = [
        ['Crop / Commodity', result.crop],
        ['State', result.state],
        ['Prediction Date', dateStr],
        ['Model Used', modelLabel],
      ];

      doc.setFontSize(10);
      summaryRows.forEach(([label, value]) => {
        doc.setFillColor(245, 248, 245);
        doc.rect(14, y - 5, 182, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 46, 26);
        doc.text(label, 18, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value || ''), 80, y);
        y += 10;
      });

      y += 8;

      // ── Price Results ──
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Price Prediction Results', 14, y);
      doc.line(14, y + 3, 196, y + 3);
      y += 12;

      const priceRows = [
        ['Current Price', fmt(result.curPrice) + ' / quintal'],
        ['Predicted Future Price', fmt(result.futPrice) + ' / quintal'],
        ['Price Change', '+' + result.pct + '%'],
        ['Confidence', Math.round(result.conf) + '%'],
        ['Min Price Range', fmt(result.min)],
        ['Max Price Range', fmt(result.max)],
        ['Prediction Horizon', result.days + ' days'],
      ];

      doc.setFontSize(10);
      priceRows.forEach(([label, value], i) => {
        doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 245 : 255);
        doc.rect(14, y - 5, 182, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 46, 26);
        doc.text(label, 18, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 80, y);
        y += 10;
      });

      y += 8;

      // ── Year-wise Trend ──
      if (result.labels && result.labels.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Year-wise Price Trend', 14, y);
        doc.line(14, y + 3, 196, y + 3);
        y += 12;

        // Table header
        doc.setFillColor(58, 125, 68);
        doc.rect(14, y - 5, 182, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Year', 20, y);
        doc.text('Predicted Price', 65, y);
        doc.text('Min Confidence', 110, y);
        doc.text('Max Confidence', 155, y);
        y += 10;

        doc.setTextColor(26, 46, 26);
        doc.setFont('helvetica', 'normal');
        result.labels.forEach((label, i) => {
          doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 245 : 255);
          doc.rect(14, y - 5, 182, 10, 'F');
          doc.text(String(label), 20, y);
          doc.text(fmt(result.prices[i] || 0), 65, y);
          doc.text(fmt(result.pMin[i] || 0), 110, y);
          doc.text(fmt(result.pMax[i] || 0), 155, y);
          y += 10;
        });
      }

      // ── Disclaimer Footer ──
      y += 5;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(255, 248, 225);
      doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(124, 96, 0);
      doc.text('Disclaimer: This prediction is AI-generated based on historical data. Actual prices may vary', 18, y + 7);
      doc.text('due to weather, market conditions, and other factors. Use as a guide, not an absolute forecast.', 18, y + 13);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.text('AgriPaiya - Crop Price Prediction System | Powered by Hybrid ARIMA + XGBoost', 105, y + 20, { align: 'center' });

      doc.save(result.crop + '_' + result.state + '_prediction.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Error generating PDF: ' + err.message);
    }
  };

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
          <FormGroup label="Prediction Date">
            <input type="date" value={form.predictionDate} onChange={e => set('predictionDate', e.target.value)} min={getToday()} max="2035-12-31" style={inp.field} />
            <div style={{ fontSize: '0.78rem', color: '#6b8e6b', marginTop: 4 }}>
              Forecast for: {MONTHS[parsedDate.getMonth()]} {parsedDate.getFullYear()}
            </div>
          </FormGroup>

          <PredictButton onClick={predict} />

          {error && (
            <div style={{ marginTop: '1rem', background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 10, padding: '10px 14px', fontSize: '0.84rem', color: '#e65100' }}>
              ⚡ {error}
            </div>
          )}

          {result && (
            <div ref={resultRef} style={{ marginTop: '2rem', animation: 'fadeUp 0.4s ease' }}>
              <ModelBadge modelType={result.modelType} />
              <Disclaimer />
              <PriceCard result={result} />
              <RangeCard result={result} />
              <ChartCard result={result} />
              <AdviceCard result={result} />
              <DownloadPDFButton onClick={downloadPDF} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ModelBadge({ modelType }) {
  const labels = {
    hybrid_arima_xgboost: { text: '🤖 Hybrid ARIMA + XGBoost Model', bg: '#e8f5e9', color: '#2e7d32' },
    statistical_fallback: { text: '📊 Statistical Estimation (Model training needed)', bg: '#fff8e1', color: '#f57f17' },
    offline_fallback: { text: '⚡ Offline Mode (Server waking up)', bg: '#fff3e0', color: '#e65100' },
  };
  const info = labels[modelType] || labels.offline_fallback;
  return (
    <div style={{ background: info.bg, borderRadius: 8, padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600, color: info.color, textAlign: 'center', marginBottom: '1rem' }}>
      {info.text}
    </div>
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
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>₹{Math.round(futPrice).toLocaleString('en-IN')}</div>
      <div style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '1rem' }}>/quintal</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
        {[{ v: Math.round(conf) + '%', l: 'Confidence' }, { v: days, l: 'Days' }, { v: '±₹' + Math.round(range).toLocaleString('en-IN'), l: 'Range' }].map((m, i) => (
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
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#c62828', minWidth: 80 }}>₹{Math.round(min).toLocaleString('en-IN')}</span>
        <div style={{ flex: 1, height: 8, background: 'linear-gradient(to right, #ef9a9a, #a5d6a7, #66bb6a)', borderRadius: 4, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, background: '#2d6235', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </div>
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#2e7d32', minWidth: 80, textAlign: 'right' }}>₹{Math.round(max).toLocaleString('en-IN')}</span>
      </div>
      <div style={{ fontSize: '0.82rem', color: '#4a6b4a' }}>Range Span: ₹{Math.round(range * 2).toLocaleString('en-IN')} ({variation}% variation)</div>
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
  const { conf, crop, years, advice: apiAdvice } = result;
  const cropName = crop.charAt(0).toUpperCase() + crop.slice(1);

  // Use advice from API if available, otherwise generate locally
  const advice = apiAdvice || [
    { icon: '🎯', title: 'Market Timing Advice', text: `Consider holding ${cropName} for ${Math.round(years * 0.4 * 12)} more months for potentially better prices at your target mandi.` },
    { icon: '🌤', title: 'Seasonal Outlook', text: 'Monitor weather forecasts closely. Price volatility typically increases near harvest season in your region.' },
    { icon: '⚠', title: 'Risk Warning', text: `${conf > 90 ? 'Low risk' : 'Moderate risk'} — ${conf > 90 ? 'market conditions are relatively stable for this crop' : 'general market shifts are possible, monitor trends'}.` },
    { icon: '✅', title: "Today's Action Plan", text: `Prediction confidence is ${Math.round(conf)}%. Compare prices at 2–3 nearby mandis before selling. Factor in transportation costs for the best net return.` },
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

function DownloadPDFButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', padding: '14px', background: hov ? 'linear-gradient(135deg, #1565c0, #0d47a1)' : 'linear-gradient(135deg, #1976d2, #1565c0)', color: 'white', border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif", transform: hov ? 'translateY(-1px)' : 'none', boxShadow: hov ? '0 6px 20px rgba(25,118,210,0.35)' : '0 2px 8px rgba(25,118,210,0.2)', marginTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Download PDF Report
    </button>
  );
}
