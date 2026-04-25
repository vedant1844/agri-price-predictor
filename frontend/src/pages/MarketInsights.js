import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchMarketData } from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const selStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid rgba(58,125,68,0.2)',
  borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: '0.92rem',
  color: '#1a2e1a', background: 'white', appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer', outline: 'none',
};

// Fallback data (used ONLY when backend is unreachable)
const FALLBACK = {
  'Cotton':    { markets:['Sayala APMC','Dhoraji APMC'], min:[6300,6600], modal:[6900,7200], max:[7600,7800], latest:7000, avg:7303, minR:6690, maxR:7703 },
  'Wheat':     { markets:['Pusa APMC','Panipat APMC'],  min:[2100,2200], modal:[2400,2500], max:[2700,2800], latest:2350, avg:2480, minR:2100, maxR:2800 },
  'Rice':      { markets:['Kurnool APMC','Nalgonda APMC'], min:[2500,2600], modal:[2850,2950], max:[3100,3250], latest:2800, avg:2920, minR:2500, maxR:3250 },
  'Groundnut': { markets:['Rajkot APMC','Junagadh APMC'], min:[5000,5200], modal:[5500,5700], max:[6200,6400], latest:5450, avg:5630, minR:5000, maxR:6400 },
  'Castor':    { markets:['Mehsana APMC','Unjha APMC'], min:[5800,6000], modal:[6300,6500], max:[6900,7100], latest:6200, avg:6380, minR:5800, maxR:7100 },
};

export default function MarketInsights() {
  const [filters, setFilters] = useState({ state:'Gujarat', market:'Dhandhuka APMC', commodity:'Cotton' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [src, setSrc] = useState(null);

  const set = (k,v) => setFilters(p => ({...p,[k]:v}));

  const getData = async () => {
    setLoading(true);
    try {
      // ✅ Fetch live data from backend → Government API
      const data = await fetchMarketData({ state: filters.state, commodity: filters.commodity });

      if (data.markets && data.markets.length > 0) {
        const mkts = data.markets.slice(0, 8);
        const names = mkts.map(m => m.market);
        const minArr = mkts.map(m => m.min_price);
        const modalArr = mkts.map(m => m.modal_price);
        const maxArr = mkts.map(m => m.max_price);

        setResult({
          markets: names,
          min: minArr,
          modal: modalArr,
          max: maxArr,
          latest: data.summary?.latest_price || modalArr[0],
          avg: data.summary?.avg_price || Math.round(modalArr.reduce((a,b)=>a+b,0)/modalArr.length),
          minR: data.summary?.min_range || Math.min(...minArr),
          maxR: data.summary?.max_range || Math.max(...maxArr),
          commodity: filters.commodity,
          market: filters.market,
          state: filters.state,
          totalMarkets: data.summary?.total_markets || mkts.length,
        });
        setSrc('api');
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No market data available');
      }
    } catch (err) {
      console.warn('Using fallback market data:', err.message);
      const d = FALLBACK[filters.commodity] || FALLBACK['Cotton'];
      setResult({ ...d, commodity: filters.commodity, market: filters.market, state: filters.state });
      setSrc('fallback');
    } finally {
      setLoading(false);
    }
  };

  const barData = result ? {
    labels: result.markets,
    datasets: [
      { label:'Min Price', data:result.min, backgroundColor:'rgba(198,40,40,0.75)', borderRadius:5 },
      { label:'Modal Price', data:result.modal, backgroundColor:'rgba(21,101,192,0.75)', borderRadius:5 },
      { label:'Max Price', data:result.max, backgroundColor:'rgba(46,125,50,0.75)', borderRadius:5 },
    ],
  } : null;

  const minY = result ? Math.max(0, Math.min(...result.min) - 500) : 0;
  const chartOpts = {
    responsive: true,
    plugins: { legend: { position:'bottom', labels:{ font:{size:11}, boxWidth:12 }}},
    scales: { y: { min: minY, ticks: { callback: v=>'₹'+Number(v).toLocaleString('en-IN'), font:{size:10} }}}
  };

  const summaryCards = result ? [
    { lbl:'Latest Price', val:'₹'+result.latest.toLocaleString('en-IN'), sub:'per quintal', cls:'blue' },
    { lbl:'Average Price', val:'₹'+result.avg.toLocaleString('en-IN'), sub:'per quintal', cls:'green2' },
    { lbl:'Min Range', val:'₹'+result.minR.toLocaleString('en-IN'), sub:'average', cls:'red' },
    { lbl:'Max Range', val:'₹'+result.maxR.toLocaleString('en-IN'), sub:'average', cls:'orange' },
  ] : [];

  const colors = { blue:'#1565c0', green2:'#2e7d32', red:'#c62828', orange:'#e65100' };
  const bgs = { blue:'#e3f2fd', green2:'#e8f5e9', red:'#ffebee', orange:'#fff3e0' };

  return (
    <>
      {loading && <LoadingOverlay message="Fetching live market data..." />}
      <div style={{ minHeight:'calc(100vh - 64px)', background:'#f0f7f0', padding:'3rem 1.5rem' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', color:'#2d6235', marginBottom:4 }}>🏪 Market Insights</h2>
          <p style={{ color:'#4a6b4a', marginBottom:'2rem' }}>Real-time mandi prices and market comparisons across APMC markets</p>

          <div style={{ background:'white', borderRadius:14, padding:'1.5rem', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'1rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', alignItems:'end' }}>
            {[ {label:'State',key:'state',opts:['Gujarat','Maharashtra','Karnataka','Punjab','Uttar Pradesh']},
               {label:'Market',key:'market',opts:['Dhandhuka APMC','Sayala APMC','Dhoraji APMC','Rajkot APMC','Surat APMC']},
               {label:'Commodity',key:'commodity',opts:['Cotton','Wheat','Rice','Groundnut','Castor']} ].map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#4a6b4a', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>{f.label}</label>
                <select value={filters[f.key]} onChange={e=>set(f.key,e.target.value)} style={selStyle}>{f.opts.map(o=><option key={o}>{o}</option>)}</select>
              </div>
            ))}
            <div><FetchButton onClick={getData} /></div>
          </div>

          {result && (
            <div style={{ animation:'fadeUp 0.4s ease' }}>
              {src==='api' && <div style={{ background:'#e8f5e9', border:'1px solid #a5d6a7', borderRadius:10, padding:'10px 16px', fontSize:'0.85rem', color:'#2e7d32', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:8 }}>✅ Live data from Government of India API — {result.totalMarkets || result.markets.length} markets found</div>}
              {src==='fallback' && <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'10px 16px', fontSize:'0.85rem', color:'#7c6000', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:8 }}>⚡ Server waking up — showing estimated prices. Try again in 30 seconds.</div>}

              <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' }}>
                <h4 style={{ fontSize:'1.05rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>Today's Prices — {result.commodity}</h4>
                <Bar data={barData} options={chartOpts} />
                <div style={{ fontSize:'0.8rem', color:'#777', marginTop:'0.8rem', textAlign:'center' }}>
                  {src==='api' ? '✅ Data sourced from Government of India Open Data API' : 'ℹ Government API provides current day prices only.'}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
                {summaryCards.map((c,i)=>(
                  <div key={i} style={{ background:bgs[c.cls], borderRadius:10, padding:'1.2rem', borderLeft:`3px solid ${colors[c.cls]}`, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize:'0.78rem', color:'#4a6b4a', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{c.lbl}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', fontWeight:600, color:colors[c.cls] }}>{c.val}</div>
                    <div style={{ fontSize:'0.8rem', color:'#4a6b4a', marginTop:3 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>ℹ Market Details</h4>
                <div style={{ background:'#f1f8f1', borderRadius:10, padding:'1rem 1.2rem', fontSize:'0.87rem', color:'#4a6b4a', lineHeight:1.9 }}>
                  <strong style={{ color:'#1a2e1a' }}>Market:</strong> {result.market} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>Commodity:</strong> {result.commodity} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>Source:</strong> {src==='api'?'data.gov.in (Live)':'Estimated'}<br/>
                  <strong style={{ color:'#1a2e1a' }}>Last Updated:</strong> {new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          )}

          {!result && (
            <div style={{ textAlign:'center', padding:'4rem 2rem', color:'#4a6b4a' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🏪</div>
              <p style={{ fontSize:'1rem' }}>Select your market and commodity, then click <strong>"Get Market Data"</strong></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FetchButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:'11px 20px', background:hov?'#2d6235':'#3a7d44', color:'white', border:'none', borderRadius:8, fontSize:'0.92rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'background 0.2s', width:'100%' }}>
      Get Market Data
    </button>
  );
}
