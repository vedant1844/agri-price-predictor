import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchStates } from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = process.env.REACT_APP_API_URL || 'https://agri-backend-y21k.onrender.com';

const selStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid rgba(58,125,68,0.2)',
  borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: '0.92rem',
  color: '#1a2e1a', background: 'white', appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer', outline: 'none',
};
const lblStyle = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'#4a6b4a', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' };

function getToday() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }); }

export default function MarketInsights() {
  const [state, setState] = useState('');
  const [stateOpts, setStateOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [noData, setNoData] = useState(false);
  const [dataDate, setDataDate] = useState(getToday());

  // Load states
  useEffect(() => {
    async function load() {
      try {
        const sRes = await fetchStates();
        const states = sRes.states || [];
        if (states.length > 0) { setStateOpts(states); setState(states[0]); }
        else { setStateOpts(['Maharashtra','Tamil Nadu','Gujarat','Karnataka']); setState('Maharashtra'); }
      } catch {
        setStateOpts(['Maharashtra','Tamil Nadu','Gujarat','Karnataka']);
        setState('Maharashtra');
      }
    }
    load();
  }, []);

  // Fetch today's data when state changes
  const loadData = useCallback(async (selectedState) => {
    if (!selectedState) return;
    setLoading(true); setNoData(false);
    try {
      const url = `${API_BASE}/prices?state=${encodeURIComponent(selectedState)}&limit=2000`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setNoData(true); setRecords([]);
        return;
      }

      // Filter strictly by TODAY's date only
      const today = getToday();
      setDataDate(today);
      const todayRecords = data.filter(p => p.arrival_date === today);

      if (todayRecords.length === 0) {
        setNoData(true); setRecords([]);
      } else {
        setNoData(false); setRecords(todayRecords);
      }
    } catch (err) {
      console.error('Market data error:', err);
      // Retry once
      try {
        await new Promise(r => setTimeout(r, 3000));
        const url = `${API_BASE}/prices?state=${encodeURIComponent(selectedState)}&limit=2000`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const today = getToday();
          setDataDate(today);
          const todayRecords = data.filter(p => p.arrival_date === today);
          setNoData(todayRecords.length === 0); setRecords(todayRecords);
        } else {
          setNoData(true); setRecords([]);
        }
      } catch { setNoData(true); setRecords([]); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (state) loadData(state); }, [state, loadData]);

  // Group records by market
  const marketGroups = {};
  records.forEach(r => {
    const mkt = r.market || 'Unknown';
    if (!marketGroups[mkt]) marketGroups[mkt] = { district: r.district, items: [] };
    marketGroups[mkt].items.push(r);
  });

  const marketNames = Object.keys(marketGroups).sort();
  const uniqueCommodities = [...new Set(records.map(r => r.commodity))].sort();
  const uniqueDistricts = [...new Set(records.map(r => r.district))].sort();

  // Summary stats
  const allModal = records.map(r => r.modal_price || 0).filter(v => v > 0);
  const avgPrice = allModal.length > 0 ? Math.round(allModal.reduce((a,b) => a+b, 0) / allModal.length) : 0;
  const minPrice = allModal.length > 0 ? Math.min(...allModal) : 0;
  const maxPrice = allModal.length > 0 ? Math.max(...allModal) : 0;

  // Top 15 markets by avg modal price for chart
  const chartMarkets = marketNames.slice(0, 15).map(mkt => {
    const items = marketGroups[mkt].items;
    const avg = Math.round(items.reduce((s, i) => s + (i.modal_price || 0), 0) / items.length);
    const min = Math.min(...items.map(i => i.min_price || 0));
    const max = Math.max(...items.map(i => i.max_price || 0));
    return { name: mkt.length > 25 ? mkt.substring(0,23)+'..' : mkt, avg, min, max };
  });

  const barData = chartMarkets.length > 0 ? {
    labels: chartMarkets.map(m => m.name),
    datasets: [
      { label: 'Min Price', data: chartMarkets.map(m => m.min), backgroundColor: 'rgba(198,40,40,0.7)', borderRadius: 4 },
      { label: 'Avg Modal', data: chartMarkets.map(m => m.avg), backgroundColor: 'rgba(21,101,192,0.8)', borderRadius: 4 },
      { label: 'Max Price', data: chartMarkets.map(m => m.max), backgroundColor: 'rgba(46,125,50,0.7)', borderRadius: 4 },
    ],
  } : null;

  const useHorizontal = chartMarkets.length > 8;
  const chartOpts = {
    responsive: true,
    indexAxis: useHorizontal ? 'y' : 'x',
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
    scales: {
      [useHorizontal ? 'x' : 'y']: { ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN'), font: { size: 10 } } },
      [useHorizontal ? 'y' : 'x']: { ticks: { font: { size: 9 } } }
    },
  };

  return (
    <>
      {loading && <LoadingOverlay message="Fetching today's market data..." />}
      <div style={{ minHeight:'calc(100vh - 64px)', background:'#f0f7f0', padding:'3rem 1.5rem' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', color:'#2d6235', marginBottom:4 }}>🏪 Market Insights</h2>
          <p style={{ color:'#4a6b4a', marginBottom:'2rem' }}>Today's market-wise price data from APMC markets across India</p>

          {/* State Selector */}
          <div style={{ background:'white', borderRadius:14, padding:'1.5rem', display:'flex', gap:'1rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', alignItems:'end', flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 200px' }}>
              <label style={lblStyle}>State</label>
              <select value={state} onChange={e => setState(e.target.value)} style={selStyle}>
                {stateOpts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ background:'#e8f5e9', borderRadius:8, padding:'10px 16px', fontSize:'0.85rem', color:'#2e7d32', fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
              📅 <strong>{formatDate(dataDate)}</strong>
            </div>
          </div>

          {/* No Data */}
          {noData && !loading && (
            <div style={{ background:'white', borderRadius:14, padding:'3rem 2rem', textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📭</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', color:'#c62828', marginBottom:'0.5rem' }}>No Market Data Today</h3>
              <p style={{ color:'#4a6b4a', fontSize:'0.9rem' }}>No market records found for <strong>{state}</strong> today. Try a different state.</p>
            </div>
          )}

          {/* Data Found */}
          {!noData && records.length > 0 && (
            <>
              {/* Status Banner */}
              <div style={{ background:'#e8f5e9', border:'1px solid #a5d6a7', borderRadius:10, padding:'10px 14px', fontSize:'0.84rem', color:'#2e7d32', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>✅ <strong>{records.length}</strong> records from <strong>{marketNames.length}</strong> markets in <strong>{state}</strong></span>
                <span style={{ fontSize:'0.78rem', color:'#4a6b4a' }}>Date: {formatDate(dataDate)}</span>
              </div>

              {/* Summary Cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:'0.8rem', marginBottom:'1.5rem' }}>
                {[
                  { val: records.length, lbl: 'Total Records', color: '#3a7d44', bg: '#e8f5e9' },
                  { val: marketNames.length, lbl: 'Markets', color: '#6a1b9a', bg: '#f3e5f5' },
                  { val: uniqueCommodities.length, lbl: 'Commodities', color: '#1565c0', bg: '#e3f2fd' },
                  { val: uniqueDistricts.length, lbl: 'Districts', color: '#e65100', bg: '#fff3e0' },
                  { val: '₹'+avgPrice.toLocaleString('en-IN'), lbl: 'Avg Modal Price', color: '#2e7d32', bg: '#e8f5e9' },
                  { val: '₹'+minPrice.toLocaleString('en-IN')+'–'+maxPrice.toLocaleString('en-IN'), lbl: 'Price Range', color: '#c62828', bg: '#ffebee' },
                ].map((s,i) => (
                  <div key={i} style={{ background: s.bg, borderRadius:10, padding:'1rem', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize: typeof s.val === 'number' ? '1.6rem' : '1rem', fontWeight:600, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:'0.73rem', color:'#4a6b4a', marginTop:2 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Market-wise Chart */}
              {barData && (
                <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' }}>
                  <h4 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>
                    📊 Market-wise Price Comparison {chartMarkets.length < marketNames.length && `(Top ${chartMarkets.length} of ${marketNames.length})`}
                  </h4>
                  <div style={{ height: useHorizontal ? Math.max(300, chartMarkets.length * 35) : 350 }}>
                    <Bar data={barData} options={{ ...chartOpts, maintainAspectRatio: false }} />
                  </div>
                  <p style={{ fontSize:'0.78rem', color:'#999', textAlign:'center', marginTop:'0.8rem' }}>
                    Prices in ₹ per Quintal — Source: Supabase (data.gov.in)
                  </p>
                </div>
              )}

              {/* Market-wise Table */}
              <div style={{ background:'white', borderRadius:14, padding:'1.2rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflowX:'auto' }}>
                <h4 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>📋 All Market Records</h4>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth:700 }}>
                  <thead>
                    <tr style={{ background:'#3a7d44', color:'white' }}>
                      {['#','Market','District','Commodity','Variety','Min Price','Modal Price','Max Price'].map(h => (
                        <th key={h} style={{ padding:'10px 8px', textAlign:'left', fontWeight:600, fontSize:'0.78rem', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r,i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#f8fbf8' : 'white', borderBottom:'1px solid #e8f0e8' }}>
                        <td style={{ padding:'7px 8px', color:'#7a9a7a', fontSize:'0.75rem' }}>{i+1}</td>
                        <td style={{ padding:'7px 8px', fontWeight:600, color:'#1a2e1a', fontSize:'0.8rem' }}>{r.market || '—'}</td>
                        <td style={{ padding:'7px 8px' }}>{r.district || '—'}</td>
                        <td style={{ padding:'7px 8px', fontWeight:500 }}>{r.commodity || '—'}</td>
                        <td style={{ padding:'7px 8px', fontSize:'0.78rem', color:'#6b8e6b' }}>{r.variety || '—'}</td>
                        <td style={{ padding:'7px 8px', color:'#c62828', fontWeight:500 }}>₹{(r.min_price||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'7px 8px', color:'#1565c0', fontWeight:700 }}>₹{(r.modal_price||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'7px 8px', color:'#2e7d32', fontWeight:500 }}>₹{(r.max_price||0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
