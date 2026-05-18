import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchPrices, fetchPriceStats, fetchCommodities, fetchStates, fetchDistricts } from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const selStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid rgba(58,125,68,0.2)',
  borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: '0.92rem',
  color: '#1a2e1a', background: 'white', appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer', outline: 'none',
};
const lblStyle = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'#4a6b4a', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' };

function getToday() { return new Date().toISOString().split('T')[0]; }

export default function HistoricalData() {
  const [filters, setFilters] = useState({ state:'', district:'All', commodity:'', date: getToday() });
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [src, setSrc] = useState('loading');
  const [noData, setNoData] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [stateOpts, setStateOpts] = useState([]);
  const [commodityOpts, setCommodityOpts] = useState([]);
  const [districtOpts, setDistrictOpts] = useState(['All']);

  const set = (k,v) => setFilters(p => ({...p,[k]:v}));

  // Load states and commodities on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, sRes] = await Promise.all([fetchCommodities(), fetchStates()]);
        const states = sRes.states || [];
        const commodities = cRes.commodities || [];
        setStateOpts(states.length > 0 ? states : ['Gujarat','Maharashtra','Karnataka']);
        setCommodityOpts(commodities.length > 0 ? commodities : ['Cotton','Wheat','Rice']);
        if (states.length > 0) setFilters(p => ({ ...p, state: p.state || states[0] }));
        if (commodities.length > 0) setFilters(p => ({ ...p, commodity: p.commodity || commodities[0] }));
      } catch {
        setStateOpts(['Gujarat','Maharashtra','Karnataka']);
        setCommodityOpts(['Cotton','Wheat','Rice']);
        setFilters(p => ({ ...p, state: p.state || 'Gujarat', commodity: p.commodity || 'Cotton' }));
      }
    }
    loadOptions();
  }, []);

  // Re-fetch districts when state changes
  useEffect(() => {
    if (!filters.state) return;
    async function loadDistricts() {
      try {
        const dRes = await fetchDistricts(filters.state);
        const districts = dRes.districts || [];
        setDistrictOpts(['All', ...districts]);
        setFilters(p => ({ ...p, district: 'All' }));
      } catch { setDistrictOpts(['All']); }
    }
    loadDistricts();
  }, [filters.state]); // eslint-disable-line

  // Fetch data when filters change
  useEffect(() => {
    if (filters.state && filters.commodity) loadData();
  }, [filters.commodity, filters.state, filters.date, filters.district]); // eslint-disable-line

  async function loadData(overrideDate) {
    setLoading(true);
    setNoData(false);
    try {
      const [pricesData, statsData] = await Promise.all([
        fetchPrices({ commodity: filters.commodity, state: filters.state, limit: 500 }),
        fetchPriceStats({ commodity: filters.commodity, state: filters.state }),
      ]);

      if (!Array.isArray(pricesData) || pricesData.length === 0) {
        setNoData(true); setRecords([]); setStats(null); setSrc('api');
        setAvailableDates([]);
        setLoading(false); return;
      }

      // Apply district filter first (if selected)
      let districtFiltered = pricesData;
      if (filters.district && filters.district !== 'All') {
        districtFiltered = pricesData.filter(p => p.district === filters.district);
      }

      // Extract available dates from district-filtered data
      const allDates = [...new Set(districtFiltered.map(p => p.arrival_date).filter(Boolean))].sort().reverse();
      setAvailableDates(allDates);

      if (districtFiltered.length === 0) {
        setNoData(true); setRecords([]); setStats(statsData); setSrc('api');
        setLoading(false); return;
      }

      // Auto-select latest available date on first load
      const dateToUse = overrideDate || filters.date;
      if (!overrideDate && filters.date === getToday() && allDates.length > 0 && !allDates.includes(getToday())) {
        setFilters(p => ({ ...p, date: allDates[0] }));
        setLoading(false); return;
      }

      // Filter by date
      const filtered = districtFiltered.filter(p => p.arrival_date === dateToUse);

      if (filtered.length === 0) {
        setNoData(true); setRecords([]); setStats(statsData); setSrc('api');
      } else {
        setNoData(false); setRecords(filtered); setStats(statsData); setSrc('api');
      }
    } catch (err) {
      console.warn('Error:', err.message);
      setNoData(true); setRecords([]); setStats(null); setSrc('fallback');
      setAvailableDates([]);
    } finally { setLoading(false); }
  }

  // Compute summary from matching records
  const matchCount = records.length;
  const minPrice = matchCount > 0 ? Math.min(...records.map(r => r.min_price || r.modal_price || r.price)) : 0;
  const maxPrice = matchCount > 0 ? Math.max(...records.map(r => r.max_price || r.modal_price || r.price)) : 0;
  const avgModal = matchCount > 0 ? Math.round(records.reduce((s,r) => s + (r.modal_price || r.price || 0), 0) / matchCount) : 0;

  // Bar chart: group by market
  const marketMap = {};
  records.forEach(r => {
    const mkt = r.market || r.district || 'Unknown';
    if (!marketMap[mkt]) marketMap[mkt] = { min: [], modal: [], max: [] };
    marketMap[mkt].min.push(r.min_price || r.price || 0);
    marketMap[mkt].modal.push(r.modal_price || r.price || 0);
    marketMap[mkt].max.push(r.max_price || r.price || 0);
  });
  const marketLabels = Object.keys(marketMap);
  const avgOf = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
  const barData = {
    labels: marketLabels,
    datasets: [
      { label:'Min Price', data: marketLabels.map(m => avgOf(marketMap[m].min)), backgroundColor:'rgba(198,40,40,0.7)', borderRadius:4 },
      { label:'Modal Price', data: marketLabels.map(m => avgOf(marketMap[m].modal)), backgroundColor:'rgba(21,101,192,0.7)', borderRadius:4 },
      { label:'Max Price', data: marketLabels.map(m => avgOf(marketMap[m].max)), backgroundColor:'rgba(46,125,50,0.7)', borderRadius:4 },
    ],
  };
  const chartOpts = { responsive:true, maintainAspectRatio:true, indexAxis: marketLabels.length > 6 ? 'y' : 'x',
    plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, boxWidth:10 }}},
    scales:{ [marketLabels.length > 6 ? 'x' : 'y']:{ ticks:{ callback:v=>'₹'+(v/1000).toFixed(1)+'k', font:{size:9} }}} };

  const dateLabel = new Date(filters.date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      {loading && <LoadingOverlay message="Fetching historical data..." />}
      <div style={{ minHeight:'calc(100vh - 64px)', background:'#f0f7f0', padding:'3rem 1.5rem' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', color:'#2d6235', marginBottom:4 }}>📊 Historical Data</h2>
          <p style={{ color:'#4a6b4a', marginBottom:'2rem' }}>Explore price data for a specific date, state, and commodity</p>

          {src==='fallback' && <div style={{ background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:10, padding:'10px 14px', fontSize:'0.84rem', color:'#e65100', marginBottom:'1rem' }}>⚡ Server waking up — please try again in 30 seconds.</div>}
          {src==='api' && !noData && <div style={{ background:'#e8f5e9', border:'1px solid #a5d6a7', borderRadius:10, padding:'10px 14px', fontSize:'0.84rem', color:'#2e7d32', marginBottom:'1rem' }}>✅ Showing live data from Supabase database</div>}

          {/* Filters */}
          <div style={{ background:'white', borderRadius:14, padding:'1.5rem', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div>
              <label style={lblStyle}>State</label>
              <select value={filters.state} onChange={e=>set('state',e.target.value)} style={selStyle}>{stateOpts.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div>
              <label style={lblStyle}>District</label>
              <select value={filters.district} onChange={e=>set('district',e.target.value)} style={selStyle}>{districtOpts.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div>
              <label style={lblStyle}>Commodity</label>
              <select value={filters.commodity} onChange={e=>set('commodity',e.target.value)} style={selStyle}>{commodityOpts.map(o=><option key={o}>{o}</option>)}</select>
            </div>
            <div>
              <label style={lblStyle}>Date</label>
              <input type="date" value={filters.date} onChange={e=>set('date',e.target.value)} max={getToday()} style={selStyle} />
            </div>
          </div>

          {/* No Data State */}
          {noData && !loading && (
            <div style={{ background:'white', borderRadius:14, padding:'3rem 2rem', textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📭</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', color:'#c62828', marginBottom:'0.5rem' }}>Data Not Available</h3>
              <p style={{ color:'#4a6b4a', fontSize:'0.9rem', lineHeight:1.6, maxWidth:400, margin:'0 auto' }}>
                No price records found for <strong>{filters.commodity}</strong> in <strong>{filters.state}</strong>
                {filters.district !== 'All' && <> ({filters.district})</>} on <strong>{dateLabel}</strong>.
              </p>
              {availableDates.length > 0 && (
                <div style={{ marginTop:'1.2rem' }}>
                  <p style={{ color:'#3a7d44', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.5rem' }}>📅 Available dates with data:</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
                    {availableDates.slice(0, 10).map(d => (
                      <button key={d} onClick={() => set('date', d)}
                        style={{ padding:'6px 12px', background: d === filters.date ? '#3a7d44' : '#e8f5e9', color: d === filters.date ? 'white' : '#2d6235', border:'1px solid #a5d6a7', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:500, transition:'all 0.15s' }}>
                        {new Date(d+'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {availableDates.length === 0 && (
                <p style={{ color:'#7a9a7a', fontSize:'0.82rem', marginTop:'1rem' }}>
                  No data exists for this commodity and state. Try a different combination.
                </p>
              )}
            </div>
          )}

          {/* Data Found */}
          {!noData && matchCount > 0 && (
            <>
              {/* Stats Cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
                {[
                  { val: '₹'+minPrice.toLocaleString('en-IN'), lbl:'Minimum Price', color:'#c62828' },
                  { val: '₹'+maxPrice.toLocaleString('en-IN'), lbl:'Maximum Price', color:'#2e7d32' },
                  { val: '₹'+avgModal.toLocaleString('en-IN'), lbl:'Avg Modal Price', color:'#1565c0' },
                  { val: matchCount, lbl:'Records Found', color:'#3a7d44' },
                ].map((s,i) => (
                  <div key={i} style={{ background:'white', borderRadius:10, padding:'1.2rem', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:600, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:'0.78rem', color:'#4a6b4a', marginTop:3 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Market-wise Chart */}
              {marketLabels.length > 0 && (
                <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' }}>
                  <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>📊 Market-wise Prices — {dateLabel}</h4>
                  <Bar data={barData} options={chartOpts} />
                </div>
              )}

              {/* Records Table */}
              <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem', overflowX:'auto' }}>
                <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>📋 Price Records — {dateLabel}</h4>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                  <thead>
                    <tr style={{ background:'#3a7d44', color:'white' }}>
                      {['Market','District','Variety','Min Price','Modal Price','Max Price'].map(h => (
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:600, fontSize:'0.8rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r,i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#f8fbf8' : 'white', borderBottom:'1px solid #e8f0e8' }}>
                        <td style={{ padding:'9px 12px', fontWeight:500 }}>{r.market || '—'}</td>
                        <td style={{ padding:'9px 12px' }}>{r.district || '—'}</td>
                        <td style={{ padding:'9px 12px' }}>{r.variety || '—'}</td>
                        <td style={{ padding:'9px 12px', color:'#c62828', fontWeight:500 }}>₹{(r.min_price || r.price || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'9px 12px', color:'#1565c0', fontWeight:600 }}>₹{(r.modal_price || r.price || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'9px 12px', color:'#2e7d32', fontWeight:500 }}>₹{(r.max_price || r.price || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>ℹ Data Summary</h4>
                <div style={{ background:'#f1f8f1', borderRadius:10, padding:'1rem 1.2rem', fontSize:'0.87rem', color:'#4a6b4a', lineHeight:1.9 }}>
                  <strong style={{ color:'#1a2e1a' }}>Date:</strong> {dateLabel} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>State:</strong> {filters.state} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>District:</strong> {filters.district} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>Commodity:</strong> {filters.commodity} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>Records:</strong> {matchCount} &nbsp;|&nbsp;
                  <strong style={{ color:'#1a2e1a' }}>Source:</strong> Supabase (Live)
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
