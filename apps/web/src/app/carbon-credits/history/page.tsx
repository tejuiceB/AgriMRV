'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface CreditHistoryRecord {
  id: number;
  plot_name: string;
  biomass_kg: number;
  carbon_stock_kg: number;
  carbon_stock_tons: number;
  co2_equivalent_kg: number;
  co2_equivalent_tons: number;
  credits_generated: number;
  market_price_usd: string;
  market_price_inr: string;
  estimated_value_usd: number;
  estimated_value_inr: number;
  calculation_date: string;
  methodology: string;
}

export default function CarbonCreditsHistoryPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<CreditHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CreditHistoryRecord | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCreditHistory();
  }, [isAuthenticated, token]);

  const fetchCreditHistory = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:4000/api/carbon-credits/credits/history?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.data);
      } else {
        setError('Failed to load credit history');
      }
    } catch (err) {
      console.error('Error fetching credit history:', err);
      setError('Network error occurred');
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
            <span className="ml-3 text-gray-600">Loading credit history...</span>
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
            📈 Carbon Credits History
          </h1>
          <div className="flex space-x-3">
            <Link
              href="/carbon-credits/calculate"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
            >
              + New Calculation
            </Link>
            <Link
              href="/carbon-credits"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {history.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800">Total Records</h3>
                <p className="text-2xl font-bold text-green-600">{history.length}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800">Total Credits</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {history.reduce((sum, record) => sum + record.credits_generated, 0).toFixed(3)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800">Total Value (USD)</h3>
                <p className="text-2xl font-bold text-purple-600">
                  ${history.reduce((sum, record) => sum + record.estimated_value_usd, 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Plot</th>
                      <th className="text-left py-3 px-4 font-semibold">Biomass (kg)</th>
                      <th className="text-left py-3 px-4 font-semibold">Credits</th>
                      <th className="text-left py-3 px-4 font-semibold">USD Value</th>
                      <th className="text-left py-3 px-4 font-semibold">INR Value</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {new Date(record.calculation_date).toLocaleDateString()}
                        </td>
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
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Credit History Yet</h2>
            <p className="text-gray-500 mb-6">Start calculating carbon credits to see your history here.</p>
            <Link
              href="/carbon-credits/calculate"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
            >
              Calculate Your First Credits
            </Link>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Credit Calculation Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Plot:</span>
                    <p className="font-medium">{selectedRecord.plot_name || `Plot ${selectedRecord.id}`}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{new Date(selectedRecord.calculation_date).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Methodology:</span>
                    <p className="font-medium">{selectedRecord.methodology}</p>
                  </div>
                </div>
              </div>

              {/* Carbon Calculations */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-3">Carbon Calculations</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Input Biomass:</span>
                    <span className="font-medium">{selectedRecord.biomass_kg?.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carbon Stock:</span>
                    <span className="font-medium">
                      {selectedRecord.carbon_stock_kg?.toLocaleString()} kg 
                      ({selectedRecord.carbon_stock_tons?.toFixed(3)} tons)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CO₂ Equivalent:</span>
                    <span className="font-medium">
                      {selectedRecord.co2_equivalent_kg?.toLocaleString()} kg 
                      ({selectedRecord.co2_equivalent_tons?.toFixed(3)} tons)
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-green-700 font-semibold">Credits Generated:</span>
                      <span className="font-bold text-green-600 text-lg">
                        {selectedRecord.credits_generated?.toFixed(3)} credits
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Valuation */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3">Market Valuation</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Market Price (USD):</span>
                    <span className="font-medium">${parseFloat(selectedRecord.market_price_usd)?.toFixed(2)} per credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Price (INR):</span>
                    <span className="font-medium">₹{parseFloat(selectedRecord.market_price_inr)?.toFixed(2)} per credit</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-semibold">Total Value (USD):</span>
                      <span className="font-bold text-blue-600 text-lg">
                        ${selectedRecord.estimated_value_usd?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-orange-700 font-semibold">Total Value (INR):</span>
                      <span className="font-bold text-orange-600 text-lg">
                        ₹{selectedRecord.estimated_value_inr?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md"
                >
                  Close
                </button>
                <Link
                  href="/carbon-credits/calculate"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-center"
                >
                  New Calculation
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
