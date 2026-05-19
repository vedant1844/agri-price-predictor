import React, { useState, useEffect } from 'react';
import LoadingOverlay from '../components/LoadingOverlay';
import { fetchPrices, fetchCommodities, fetchStates } from '../api';
import { jsPDF } from 'jspdf';

const selStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid rgba(58,125,68,0.2)',
  borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: '0.92rem',
  color: '#1a2e1a', background: 'white', appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer', outline: 'none',
};
const lblStyle = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'#4a6b4a', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' };

function getToday() { return new Date().toISOString().split('T')[0]; }

export default function HistoricalData() {
  const [state, setState] = useState('');
  const [date, setDate] = useState(getToday());
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stateOpts, setStateOpts] = useState([]);
  const [noData, setNoData] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  // Load states on mount
  useEffect(() => {
    async function load() {
      try {
        const sRes = await fetchStates();
        const states = sRes.states || [];
        setStateOpts(states.length > 0 ? states : ['Maharashtra','Tamil Nadu','Gujarat','Karnataka']);
        if (states.length > 0) setState(states[0]);
      } catch {
        setStateOpts(['Maharashtra','Tamil Nadu','Gujarat','Karnataka']);
        setState('Maharashtra');
      }
    }
    load();
  }, []);

  // Fetch data when state or date changes
  useEffect(() => {
    if (!state) return;
    loadData();
  }, [state, date]); // eslint-disable-line

  async function loadData() {
    setLoading(true); setNoData(false);
    try {
      const data = await fetchPrices({ state, limit: 1000 });
      if (!Array.isArray(data) || data.length === 0) {
        setNoData(true); setRecords([]); setAllRecords([]); setAvailableDates([]);
        setLoading(false); return;
      }
      setAllRecords(data);

      // Get all available dates
      const dates = [...new Set(data.map(p => p.arrival_date).filter(Boolean))].sort().reverse();
      setAvailableDates(dates);

      // Auto-select latest date if current date has no data
      const filtered = data.filter(p => p.arrival_date === date);
      if (filtered.length === 0 && dates.length > 0 && date === getToday()) {
        setDate(dates[0]);
        setLoading(false); return;
      }

      if (filtered.length === 0) {
        setNoData(true); setRecords([]);
      } else {
        setNoData(false); setRecords(filtered);
      }
    } catch (err) {
      console.warn('Error:', err.message);
      setNoData(true); setRecords([]); setAllRecords([]); setAvailableDates([]);
    } finally { setLoading(false); }
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  // ── PDF Download ──
  const downloadPDF = () => {
    if (records.length === 0) { alert('No data to download.'); return; }
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const now = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

      // Header
      doc.setFillColor(58, 125, 68);
      doc.rect(0, 0, 297, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Market Price Report — ' + state, 148, 14, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Date: ' + dateLabel + '  |  Generated: ' + now + '  |  Records: ' + records.length, 148, 24, { align: 'center' });

      let y = 40;

      // Table header
      doc.setFillColor(45, 98, 53);
      doc.rect(10, y - 5, 277, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const cols = [
        { x: 14, label: 'Commodity', w: 50 },
        { x: 64, label: 'District', w: 35 },
        { x: 99, label: 'Market', w: 55 },
        { x: 154, label: 'Variety', w: 35 },
        { x: 189, label: 'Min Price', w: 28 },
        { x: 217, label: 'Modal Price', w: 28 },
        { x: 245, label: 'Max Price', w: 28 },
      ];
      cols.forEach(c => doc.text(c.label, c.x, y));
      y += 8;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      records.forEach((r, i) => {
        if (y > 190) { doc.addPage(); y = 20; }
        doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 245 : 255);
        doc.rect(10, y - 4, 277, 8, 'F');
        doc.setTextColor(26, 46, 26);

        const txt = (val, maxLen) => { const s = String(val || '—'); return s.length > maxLen ? s.substring(0, maxLen-2) + '..' : s; };
        doc.text(txt(r.commodity, 28), 14, y);
        doc.text(txt(r.district, 20), 64, y);
        doc.text(txt(r.market, 30), 99, y);
        doc.text(txt(r.variety, 20), 154, y);

        doc.setTextColor(198, 40, 40);
        doc.text('Rs.' + (r.min_price || 0).toLocaleString('en-IN'), 189, y);
        doc.setTextColor(21, 101, 192);
        doc.setFont('helvetica', 'bold');
        doc.text('Rs.' + (r.modal_price || 0).toLocaleString('en-IN'), 217, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(46, 125, 50);
        doc.text('Rs.' + (r.max_price || 0).toLocaleString('en-IN'), 245, y);
        y += 8;
      });

      // Footer
      y += 5;
      if (y > 190) { doc.addPage(); y = 20; }
      doc.setFillColor(255, 248, 225);
      doc.roundedRect(10, y, 277, 14, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setTextColor(124, 96, 0);
      doc.text('Source: Supabase Database (data.gov.in)  |  Prices in Rs. per Quintal  |  AgriPaiya - Crop Price Prediction System', 148, y + 9, { align: 'center' });

      doc.save(state + '_market_data_' + date + '.pdf');
    } catch (err) {
      console.error('PDF error:', err);
      alert('Error generating PDF: ' + err.message);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay message="Fetching market data..." />}
      <div style={{ minHeight:'calc(100vh - 64px)', background:'#f0f7f0', padding:'3rem 1.5rem' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', color:'#2d6235', marginBottom:4 }}>📊 Historical Data</h2>
          <p style={{ color:'#4a6b4a', marginBottom:'2rem' }}>Select a state and date to view and download market price data</p>

          {/* Filters */}
          <div style={{ background:'white', borderRadius:14, padding:'1.5rem', display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:'1rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', alignItems:'end' }}>
            <div>
              <label style={lblStyle}>State</label>
              <select value={state} onChange={e => setState(e.target.value)} style={selStyle}>
                {stateOpts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} max={getToday()} style={selStyle} />
            </div>
            <button onClick={downloadPDF} disabled={records.length === 0}
              style={{ padding:'10px 20px', background: records.length > 0 ? 'linear-gradient(135deg, #1976d2, #1565c0)' : '#ccc', color:'white', border:'none', borderRadius:8, fontSize:'0.88rem', fontWeight:600, cursor: records.length > 0 ? 'pointer' : 'not-allowed', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', height:42 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PDF
            </button>
          </div>

          {/* No Data */}
          {noData && !loading && (
            <div style={{ background:'white', borderRadius:14, padding:'3rem 2rem', textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📭</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', color:'#c62828', marginBottom:'0.5rem' }}>Data Not Available</h3>
              <p style={{ color:'#4a6b4a', fontSize:'0.9rem', lineHeight:1.6 }}>
                No market data found for <strong>{state}</strong> on <strong>{dateLabel}</strong>.
              </p>
              {availableDates.length > 0 && (
                <div style={{ marginTop:'1.2rem' }}>
                  <p style={{ color:'#3a7d44', fontSize:'0.85rem', fontWeight:600, marginBottom:'0.5rem' }}>📅 Available dates with data:</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
                    {availableDates.slice(0, 10).map(d => (
                      <button key={d} onClick={() => setDate(d)}
                        style={{ padding:'6px 12px', background: d === date ? '#3a7d44' : '#e8f5e9', color: d === date ? 'white' : '#2d6235', border:'1px solid #a5d6a7', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
                        {new Date(d+'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {availableDates.length === 0 && (
                <p style={{ color:'#7a9a7a', fontSize:'0.82rem', marginTop:'1rem' }}>No data found for this state. Try a different one.</p>
              )}
            </div>
          )}

          {/* Data Table */}
          {!noData && records.length > 0 && (
            <>
              <div style={{ background:'#e8f5e9', border:'1px solid #a5d6a7', borderRadius:10, padding:'10px 14px', fontSize:'0.84rem', color:'#2e7d32', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>✅ Showing <strong>{records.length}</strong> records for <strong>{state}</strong> on <strong>{dateLabel}</strong></span>
                <span style={{ fontSize:'0.78rem', color:'#4a6b4a' }}>Source: Supabase</span>
              </div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:'0.8rem', marginBottom:'1.2rem' }}>
                {[
                  { val: records.length, lbl:'Total Records', color:'#3a7d44' },
                  { val: [...new Set(records.map(r=>r.commodity))].length, lbl:'Commodities', color:'#1565c0' },
                  { val: [...new Set(records.map(r=>r.district))].length, lbl:'Districts', color:'#e65100' },
                  { val: [...new Set(records.map(r=>r.market))].length, lbl:'Markets', color:'#6a1b9a' },
                ].map((s,i) => (
                  <div key={i} style={{ background:'white', borderRadius:10, padding:'1rem', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', fontWeight:600, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:'0.76rem', color:'#4a6b4a', marginTop:2 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ background:'white', borderRadius:14, padding:'1.2rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth:700 }}>
                  <thead>
                    <tr style={{ background:'#3a7d44', color:'white' }}>
                      {['#','Commodity','District','Market','Variety','Min Price','Modal Price','Max Price'].map(h => (
                        <th key={h} style={{ padding:'10px 10px', textAlign:'left', fontWeight:600, fontSize:'0.78rem', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r,i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#f8fbf8' : 'white', borderBottom:'1px solid #e8f0e8' }}>
                        <td style={{ padding:'8px 10px', color:'#7a9a7a', fontSize:'0.75rem' }}>{i+1}</td>
                        <td style={{ padding:'8px 10px', fontWeight:600, color:'#1a2e1a' }}>{r.commodity || '—'}</td>
                        <td style={{ padding:'8px 10px' }}>{r.district || '—'}</td>
                        <td style={{ padding:'8px 10px', fontSize:'0.8rem' }}>{r.market || '—'}</td>
                        <td style={{ padding:'8px 10px', fontSize:'0.8rem', color:'#6b8e6b' }}>{r.variety || '—'}</td>
                        <td style={{ padding:'8px 10px', color:'#c62828', fontWeight:500 }}>₹{(r.min_price||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'8px 10px', color:'#1565c0', fontWeight:700 }}>₹{(r.modal_price||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'8px 10px', color:'#2e7d32', fontWeight:500 }}>₹{(r.max_price||0).toLocaleString('en-IN')}</td>
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
