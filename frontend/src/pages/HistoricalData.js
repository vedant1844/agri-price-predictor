import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchPrices, fetchPriceStats } from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const selStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid rgba(58,125,68,0.2)',
  borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: '0.92rem',
  color: '#1a2e1a', background: 'white', appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer', outline: 'none',
};

function genFallback(base) {
  return MONTHS.map((_, i) => Math.round(base + Math.sin(i*0.5+Math.random())*600 + Math.random()*400));
}

export default function HistoricalData() {
  const [filters, setFilters] = useState({ state:'Gujarat', district:'Ahmedabad', commodity:'Cotton', year:'2026' });
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [src, setSrc] = useState('loading');

  const set = (k,v) => setFilters(p => ({...p,[k]:v}));

  useEffect(() => { loadData(); }, [filters.commodity, filters.state, filters.year]); // eslint-disable-line

  async function loadData() {
    setLoading(true);
    try {
      const [pricesData, statsData] = await Promise.all([
        fetchPrices({ commodity: filters.commodity, state: filters.state, limit: 500 }),
        fetchPriceStats({ commodity: filters.commodity, state: filters.state }),
      ]);
      if (Array.isArray(pricesData) && pricesData.length > 0) {
        const mMin=Array(12).fill(null), mMod=Array(12).fill(null), mMax=Array(12).fill(null), cnt=Array(12).fill(0);
        pricesData.forEach(p => {
          const d = p.arrival_date || p.date; if (!d) return;
          const dt = new Date(d), mi = dt.getMonth();
          if (filters.year && dt.getFullYear() !== parseInt(filters.year)) return;
          const mn=p.min_price||p.price, md=p.modal_price||p.price, mx=p.max_price||p.price;
          if (!mMin[mi]) { mMin[mi]=0; mMod[mi]=0; mMax[mi]=0; }
          mMin[mi]+=mn; mMod[mi]+=md; mMax[mi]+=mx; cnt[mi]++;
        });
        const avg = (a) => a.map((v,i)=> cnt[i]>0 ? Math.round(v/cnt[i]) : null);
        const fill = (a) => { const valid=a.filter(v=>v!==null); if(!valid.length) return a; const av=Math.round(valid.reduce((s,v)=>s+v,0)/valid.length); return a.map(v=>v!==null?v:av); };
        setChartData({ minData:fill(avg(mMin)), modalData:fill(avg(mMod)), maxData:fill(avg(mMax)) });
        setStats(statsData); setSrc('api');
      } else throw new Error('No data');
    } catch (err) {
      console.warn('Fallback:', err.message);
      const b = {Cotton:6500,Wheat:2200,Rice:2700,Onion:1800,Apple:7000,Soybean:4200,Groundnut:5200}[filters.commodity]||5000;
      setChartData({ minData:genFallback(b*0.8), modalData:genFallback(b), maxData:genFallback(b*1.15) });
      setStats(null); setSrc('fallback');
    } finally { setLoading(false); }
  }

  if (!chartData) return null;
  const { minData, modalData, maxData } = chartData;
  const vMin=minData.filter(v=>v!==null), vMax=maxData.filter(v=>v!==null), vMod=modalData.filter(v=>v!==null);
  const allMin=vMin.length?Math.min(...vMin):0, allMax=vMax.length?Math.max(...vMax):0;
  const avgModal=vMod.length?Math.round(vMod.reduce((a,b)=>a+b,0)/vMod.length):0;
  const totalRec = stats?.total_records || (src==='fallback' ? 'N/A' : 0);

  const trendData = { labels: MONTHS, datasets: [
    { label:'Min Price', data:minData, borderColor:'#2e7d32', backgroundColor:'rgba(46,125,50,0.07)', borderWidth:2, tension:0.4, pointRadius:3 },
    { label:'Modal Price', data:modalData, borderColor:'#1565c0', backgroundColor:'rgba(21,101,192,0.07)', borderWidth:2, tension:0.4, pointRadius:3 },
    { label:'Max Price', data:maxData, borderColor:'#c62828', backgroundColor:'rgba(198,40,40,0.07)', borderWidth:2, tension:0.4, pointRadius:3 },
  ]};
  const barData = { labels: MONTHS, datasets: [
    { label:'Min', data:minData, backgroundColor:'rgba(198,40,40,0.72)', borderRadius:3 },
    { label:'Modal', data:modalData, backgroundColor:'rgba(21,101,192,0.72)', borderRadius:3 },
    { label:'Max', data:maxData, backgroundColor:'rgba(46,125,50,0.72)', borderRadius:3 },
  ]};
  const chartOpts = { responsive:true, maintainAspectRatio:true, plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, boxWidth:10 }}}, scales:{ y:{ ticks:{ callback:v=>'₹'+(v/1000).toFixed(1)+'k', font:{size:9} }}} };

  return (
    <>
      {loading && <LoadingOverlay message="Fetching historical data..." />}
      <div style={{ minHeight:'calc(100vh - 64px)', background:'#f0f7f0', padding:'3rem 1.5rem' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', color:'#2d6235', marginBottom:4 }}>📊 Historical Data</h2>
          <p style={{ color:'#4a6b4a', marginBottom:'2rem' }}>Explore price trends and seasonal patterns for your crops</p>

          {src==='fallback' && <div style={{ background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:10, padding:'10px 14px', fontSize:'0.84rem', color:'#e65100', marginBottom:'1rem' }}>⚡ Server waking up — showing estimated data. Refresh in 30s for live data.</div>}
          {src==='api' && <div style={{ background:'#e8f5e9', border:'1px solid #a5d6a7', borderRadius:10, padding:'10px 14px', fontSize:'0.84rem', color:'#2e7d32', marginBottom:'1rem' }}>✅ Showing live data from Supabase database</div>}

          <div style={{ background:'white', borderRadius:14, padding:'1.5rem', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            {[ {label:'State',key:'state',opts:['Gujarat','Maharashtra','Karnataka','Punjab','Uttar Pradesh','Rajasthan']},
               {label:'District',key:'district',opts:['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar']},
               {label:'Commodity',key:'commodity',opts:['Cotton','Wheat','Rice','Onion','Apple','Soybean','Groundnut']},
               {label:'Year',key:'year',opts:['2026','2025','2024','2023','2022']} ].map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'#4a6b4a', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>{f.label}</label>
                <select value={filters[f.key]} onChange={e=>set(f.key,e.target.value)} style={selStyle}>{f.opts.map(o=><option key={o}>{o}</option>)}</select>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
            {[ {val:'₹'+(stats?.min_price||allMin).toLocaleString('en-IN'),lbl:'Minimum Price',color:'#c62828'},
               {val:'₹'+(stats?.max_price||allMax).toLocaleString('en-IN'),lbl:'Maximum Price',color:'#2e7d32'},
               {val:'₹'+(stats?.avg_modal||avgModal).toLocaleString('en-IN'),lbl:'Average Modal Price',color:'#1565c0'},
               {val:typeof totalRec==='number'?totalRec.toLocaleString('en-IN'):totalRec,lbl:'Total Records',color:'#3a7d44'} ].map((s,i)=>(
              <div key={i} style={{ background:'white', borderRadius:10, padding:'1.2rem', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.7rem', fontWeight:600, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:'0.8rem', color:'#4a6b4a', marginTop:3 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.5rem', marginBottom:'1.5rem' }}>
            <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>📈 Price Trend Analysis</h4>
              <Line data={trendData} options={chartOpts} />
            </div>
            <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>📊 Monthly Price Distribution — {filters.year}</h4>
              <Bar data={barData} options={chartOpts} />
            </div>
          </div>

          <div style={{ background:'white', borderRadius:14, padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <h4 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:'1rem', color:'#1a2e1a' }}>ℹ Data Summary</h4>
            <div style={{ background:'#f1f8f1', borderRadius:10, padding:'1rem 1.2rem', fontSize:'0.87rem', color:'#4a6b4a', lineHeight:1.9 }}>
              <strong style={{ color:'#1a2e1a' }}>State:</strong> {filters.state} &nbsp;|&nbsp;
              <strong style={{ color:'#1a2e1a' }}>District:</strong> {filters.district} &nbsp;|&nbsp;
              <strong style={{ color:'#1a2e1a' }}>Commodity:</strong> {filters.commodity} &nbsp;|&nbsp;
              <strong style={{ color:'#1a2e1a' }}>Year:</strong> {filters.year} &nbsp;|&nbsp;
              <strong style={{ color:'#1a2e1a' }}>Records:</strong> {totalRec} &nbsp;|&nbsp;
              <strong style={{ color:'#1a2e1a' }}>Source:</strong> {src==='api'?'Supabase (Live)':'Estimated'}
              <br />Analysis shows historical price trends and seasonal patterns for informed decision making.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
