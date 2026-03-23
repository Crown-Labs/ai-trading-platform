import { useState, useEffect } from 'react';
import { greeting } from '@ai-trading/shared';
import Header from './components/Header';
import StatCard from './components/StatCard';
import MarketCard from './components/MarketCard';

function App() {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from backend API
    fetch('http://localhost:4000/api/test')
      .then(res => res.json())
      .then(data => {
        setApiData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch API data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-dark-800 to-dark-900 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              AI-Powered Trading
              <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                {' '}Made Simple
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              {greeting} - Leverage advanced AI algorithms to make smarter trading decisions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary text-lg px-8 py-3">
                Start Trading
              </button>
              <button className="btn-secondary text-lg px-8 py-3">
                View Markets
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Portfolio Value"
            value="$124,532"
            change="12.5%"
            isPositive={true}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="24h Trading Volume"
            value="$8,932"
            change="5.2%"
            isPositive={true}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard
            title="Active Positions"
            value="12"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <StatCard
            title="AI Accuracy"
            value="94.2%"
            change="2.1%"
            isPositive={true}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Markets Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Trending Markets</h2>
          <button className="text-primary-500 hover:text-primary-400 font-medium">
            View All →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MarketCard
            symbol="BTC/USD"
            name="Bitcoin"
            price="45,234.50"
            change="5.23"
            isPositive={true}
          />
          <MarketCard
            symbol="ETH/USD"
            name="Ethereum"
            price="3,124.80"
            change="3.45"
            isPositive={true}
          />
          <MarketCard
            symbol="SOL/USD"
            name="Solana"
            price="98.45"
            change="-1.23"
            isPositive={false}
          />
        </div>
      </section>

      {/* API Status Section */}
      <section className="container mx-auto px-6 pb-16">
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-4">API Status</h2>
          {loading ? (
            <p className="text-gray-400">Loading API data...</p>
          ) : apiData ? (
            <div className="space-y-2">
              <p className="text-gray-300">
                <span className="font-medium">Message:</span> {apiData.data}
              </p>
              <p className="text-gray-300">
                <span className="font-medium">Greeting:</span> {apiData.greeting}
              </p>
              <p className="text-gray-300">
                <span className="font-medium">Timestamp:</span> {apiData.timestamp}
              </p>
              <div className="mt-4 pt-4 border-t border-dark-700">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Connected
                </span>
              </div>
            </div>
          ) : (
            <p className="text-red-400">Failed to connect to API</p>
          )}
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-dark-800 border-t border-dark-700">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-gray-400">
            © 2026 AI Trading Platform. Built with React, TypeScript, Vite & NestJS.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
