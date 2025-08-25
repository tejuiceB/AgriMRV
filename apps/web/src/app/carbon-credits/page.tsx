'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface CreditSummary {
  total_credits: number;
  total_value_usd: number;
  total_value_inr: number;
  calculation_count: number;
}

interface MarketPrice {
  price_usd: string;
  price_inr: string;
  market_name: string;
  source: string;
  date: string;
}

interface CreditHistory {
  id: number;
  plot_name: string;
  credits_generated: number;
  estimated_value_usd: number;
  estimated_value_inr: number;
  calculation_date: string;
  biomass_kg: number;
}

export default function CarbonCreditsPage() {
  const { isAuthenticated, user, token } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [marketPrice, setMarketPrice] = useState<MarketPrice | null>(null);
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCarbonCreditData();
  }, [isAuthenticated, token]);

  const fetchCarbonCreditData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user credit summary
      const summaryResponse = await fetch('http://localhost:4000/api/carbon-credits/credits/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.data);
      }

      // Fetch market price
      const priceResponse = await fetch('http://localhost:4000/api/carbon-credits/credits/market-price');
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        setMarketPrice(priceData.data);
      }

      // Fetch credit history
      const historyResponse = await fetch('http://localhost:4000/api/carbon-credits/credits/history?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.data);
      }

    } catch (err) {
      console.error('Error fetching carbon credit data:', err);
      setError('Failed to load carbon credit data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Loading carbon credit data...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">
            💰 Carbon Credits Dashboard
          </h1>
          <Link
            href="/carbon-credits/calculate"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-semibold"
          >
            + Calculate Credits
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Market Price Section */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            📊 Current Market Price
          </h2>
          {marketPrice ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-green-600">
                  ${parseFloat(marketPrice.price_usd).toFixed(2)} USD
                </p>
                <p className="text-sm text-gray-600">per carbon credit</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-orange-600">
                  ₹{parseFloat(marketPrice.price_inr).toFixed(2)} INR
                </p>
                <p className="text-sm text-gray-600">per carbon credit</p>
              </div>
              <div className="col-span-1 md:col-span-2">
                <p className="text-sm text-gray-500">
                  <strong>Source:</strong> {marketPrice.market_name} • {marketPrice.source}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Updated:</strong> {new Date(marketPrice.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Market price data unavailable</p>
          )}
        </div>

        {/* Credit Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Total Credits</h3>
            <p className="text-3xl font-bold text-green-600">
              {summary?.total_credits?.toFixed(3) || '0.000'}
            </p>
            <p className="text-sm text-gray-600">CO₂ equivalent credits</p>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Value (USD)</h3>
            <p className="text-3xl font-bold text-blue-600">
              ${summary?.total_value_usd?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-600">Total USD value</p>
          </div>

          <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">Value (INR)</h3>
            <p className="text-3xl font-bold text-orange-600">
              ₹{summary?.total_value_inr?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-600">Total INR value</p>
          </div>

          <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Calculations</h3>
            <p className="text-3xl font-bold text-purple-600">
              {summary?.calculation_count || 0}
            </p>
            <p className="text-sm text-gray-600">Total assessments</p>
          </div>
        </div>

        {/* Recent Credits History */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              📈 Recent Credit Calculations
            </h2>
            <Link
              href="/carbon-credits/history"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              View All →
            </Link>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Plot</th>
                    <th className="text-left py-3 px-4">Biomass (kg)</th>
                    <th className="text-left py-3 px-4">Credits</th>
                    <th className="text-left py-3 px-4">USD Value</th>
                    <th className="text-left py-3 px-4">INR Value</th>
                    <th className="text-left py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {record.plot_name || `Plot ${record.id}`}
                      </td>
                      <td className="py-3 px-4">
                        {record.biomass_kg?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-green-600">
                        {record.credits_generated?.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-600">
                        ${record.estimated_value_usd?.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-orange-600">
                        ₹{record.estimated_value_inr?.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(record.calculation_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No carbon credit calculations yet</p>
              <Link
                href="/carbon-credits/calculate"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
              >
                Calculate Your First Credits
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link
            href="/carbon-credits/calculate"
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-2">🧮 Calculate Credits</h3>
            <p className="text-sm opacity-90">Calculate credits from biomass data</p>
          </Link>

          <Link
            href="/plots"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-2">🌱 Manage Plots</h3>
            <p className="text-sm opacity-90">View and calculate plot credits</p>
          </Link>

          <Link
            href="/carbon-credits/reports"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-2">📄 Generate Reports</h3>
            <p className="text-sm opacity-90">Download credit certificates</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
