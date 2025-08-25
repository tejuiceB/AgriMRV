'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface CalculationResult {
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

export default function CalculateCarbonCreditsPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [biomassKg, setBiomassKg] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-4">Please log in to calculate carbon credits.</p>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!biomassKg || parseFloat(biomassKg) <= 0) {
      setError('Please enter a valid biomass amount (kg)');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:4000/api/carbon-credits/credits/calculate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          biomass_kg: parseFloat(biomassKg)
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Failed to calculate carbon credits');
      }
    } catch (err) {
      console.error('Error calculating carbon credits:', err);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculation = () => {
    setResult(null);
    setError(null);
    setBiomassKg('');
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">
            🧮 Calculate Carbon Credits
          </h1>
          <Link
            href="/carbon-credits"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Calculation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Biomass Input
            </h2>
            
            <form onSubmit={handleCalculate} className="space-y-4">
              <div>
                <label htmlFor="biomass" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Biomass (kg)
                </label>
                <input
                  id="biomass"
                  type="number"
                  step="0.01"
                  min="0"
                  value={biomassKg}
                  onChange={(e) => setBiomassKg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter biomass in kilograms"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isCalculating}
                className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                  isCalculating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {isCalculating ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </span>
                ) : (
                  'Calculate Carbon Credits'
                )}
              </button>

              {result && (
                <button
                  type="button"
                  onClick={resetCalculation}
                  className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  New Calculation
                </button>
              )}
            </form>

            {/* Methodology Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Calculation Methodology</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• IPCC 2006 Guidelines for National GHG Inventories</li>
                <li>• Carbon fraction: 0.47 (47% of biomass)</li>
                <li>• CO₂ conversion factor: 3.67 (molecular weight ratio)</li>
                <li>• 1 credit = 1 metric ton CO₂ equivalent</li>
              </ul>
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Calculation Results
            </h2>

            {result ? (
              <div className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-600">
                      {result.credits_generated.toFixed(3)}
                    </p>
                    <p className="text-sm text-gray-600">Credits Generated</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-600">
                      ${result.estimated_value_usd.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">USD Value</p>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-orange-600 text-center">
                    ₹{result.estimated_value_inr.toFixed(2)} INR
                  </p>
                  <p className="text-sm text-gray-600 text-center">Indian Rupees Value</p>
                </div>

                {/* Detailed Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Detailed Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Input Biomass:</span>
                      <span className="font-medium">{result.biomass_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carbon Stock:</span>
                      <span className="font-medium">{result.carbon_stock_kg.toLocaleString()} kg ({result.carbon_stock_tons.toFixed(3)} tons)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CO₂ Equivalent:</span>
                      <span className="font-medium">{result.co2_equivalent_kg.toLocaleString()} kg ({result.co2_equivalent_tons.toFixed(3)} tons)</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span>Market Price:</span>
                        <span className="font-medium">${parseFloat(result.market_price_usd).toFixed(2)} USD / ₹{parseFloat(result.market_price_inr).toFixed(2)} INR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <Link
                    href="/carbon-credits"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-center font-medium"
                  >
                    View Dashboard
                  </Link>
                  <Link
                    href="/plots"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-center font-medium"
                  >
                    Calculate for Plot
                  </Link>
                </div>

                {/* Calculation Info */}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  <p>Calculation performed on: {new Date(result.calculation_date).toLocaleString()}</p>
                  <p>Methodology: {result.methodology}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-6xl mb-4">🌱</div>
                <p>Enter biomass data to see carbon credit calculations</p>
                <p className="text-sm mt-2">Results will show CO₂ equivalent and market value</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            💡 How Carbon Credits Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
            <div>
              <h4 className="font-medium mb-2">Calculation Process:</h4>
              <ul className="space-y-1">
                <li>• Biomass contains ~47% carbon by dry weight</li>
                <li>• Carbon converts to CO₂ at 3.67:1 ratio</li>
                <li>• 1 credit = 1 metric ton CO₂ sequestered</li>
                <li>• Current market rates applied for valuation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Market Information:</h4>
              <ul className="space-y-1">
                <li>• Prices vary by market and verification</li>
                <li>• Voluntary markets: $6-15 per credit</li>
                <li>• Compliance markets: $15-50+ per credit</li>
                <li>• Values updated from multiple sources</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
