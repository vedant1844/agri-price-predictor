import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import PredictPrice from './pages/PredictPrice';
import HistoricalData from './pages/HistoricalData';
import MarketInsights from './pages/MarketInsights';
import Help from './pages/Help';

export default function App() {
  const [activePage, setActivePage] = useState('home');

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
