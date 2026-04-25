import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import PredictPrice from './pages/PredictPrice';
import HistoricalData from './pages/HistoricalData';
import MarketInsights from './pages/MarketInsights';
import Help from './pages/Help';
import { wakeUpServer } from './api';

export default function App() {
  const [activePage, setActivePage] = useState('home');

  // Wake up the Render backend on page load (free tier sleeps after 15 min)
  useEffect(() => { wakeUpServer(); }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'home':     return <Home navigate={setActivePage} />;
      case 'predict':  return <PredictPrice />;
      case 'history':  return <HistoricalData />;
      case 'market':   return <MarketInsights />;
      case 'help':     return <Help />;
      default:         return <Home navigate={setActivePage} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activePage={activePage} navigate={setActivePage} />
      <main style={{ flex: 1 }}>{renderPage()}</main>
      <Footer />
    </div>
  );
}
