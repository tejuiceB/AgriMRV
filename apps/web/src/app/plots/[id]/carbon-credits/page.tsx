'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface Plot {
  id: string;
  name: string;
  area_hectares: number;
}

interface BiomassEstimation {
  totals: {
    total_biomass_kg: number;
    total_trees: number;
    avg_biomass_per_tree: number;
  };
}

interface CreditCalculation {
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

export default function PlotCarbonCreditsPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [biomassData, setBiomassData] = useState<BiomassEstimation | null>(null);
  const [creditCalculation, setCreditCalculation] = useState<CreditCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchPlotData();
  }, [isAuthenticated, token, params.id]);

  const fetchPlotData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch plot details
      const plotResponse = await fetch(`http://localhost:4000/api/plots/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (plotResponse.ok) {
        const plotData = await plotResponse.json();
        setPlot(plotData);
      }

      // Fetch biomass estimation
      const biomassResponse = await fetch(`http://localhost:4000/api/estimate/plot/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (biomassResponse.ok) {
        const biomassData = await biomassResponse.json();
        setBiomassData(biomassData);
      }

    } catch (err) {
      console.error('Error fetching plot data:', err);
      setError('Failed to load plot data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCredits = async () => {
    if (!token || !biomassData?.totals?.total_biomass_kg) {
      setError('No biomass data available. Please run biomass estimation first.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:4000/api/carbon-credits/credits/plot/${params.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCreditCalculation(data.data.calculation);
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

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Loading plot data...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-800">
              💰 Carbon Credits for {plot?.name || 'Plot'}
            </h1>
            <p className="text-gray-600 mt-2">
              Calculate and monetize carbon sequestration for this plot
            </p>
          </div>
          <Link
            href="/plots"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to Plots
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plot Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📊 Plot Information
            </h2>
            
            {plot && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plot Name:</span>
                  <span className="font-medium">{plot.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Area:</span>
                  <span className="font-medium">{plot.area_hectares} hectares</span>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🌱 Biomass Data</h3>
              {biomassData?.totals ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Trees:</span>
                    <span className="font-medium">{biomassData.totals.total_trees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Biomass:</span>
                    <span className="font-medium">{biomassData.totals.total_biomass_kg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg per Tree:</span>
                    <span className="font-medium">{biomassData.totals.avg_biomass_per_tree.toFixed(2)} kg</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-blue-700 mb-3">No biomass data available</p>
                  <Link
                    href={`/plots/${params.id}/estimation`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Run Biomass Estimation
                  </Link>
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <div className="mt-6">
              <button
                onClick={calculateCredits}
                disabled={isCalculating || !biomassData?.totals?.total_biomass_kg}
                className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                  isCalculating || !biomassData?.totals?.total_biomass_kg
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {isCalculating ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Calculating Credits...
                  </span>
                ) : (
                  '🧮 Calculate Carbon Credits'
                )}
              </button>
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              💰 Carbon Credit Results
            </h2>

            {creditCalculation ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {creditCalculation.credits_generated.toFixed(3)}
                    </p>
                    <p className="text-sm text-gray-600">Credits Generated</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      ${creditCalculation.estimated_value_usd.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">USD Value</p>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{creditCalculation.estimated_value_inr.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Indian Rupees Value</p>
                </div>

                {/* Detailed Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Calculation Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Biomass Input:</span>
                      <span className="font-medium">{creditCalculation.biomass_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carbon Stock:</span>
                      <span className="font-medium">{creditCalculation.carbon_stock_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CO₂ Equivalent:</span>
                      <span className="font-medium">{creditCalculation.co2_equivalent_tons.toFixed(3)} tons</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span>Market Price:</span>
                        <span className="font-medium">
                          ${parseFloat(creditCalculation.market_price_usd).toFixed(2)} / 
                          ₹{parseFloat(creditCalculation.market_price_inr).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Link
                    href="/carbon-credits"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-center font-medium"
                  >
                    View Dashboard
                  </Link>
                  <Link
                    href="/carbon-credits/calculate"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-center font-medium"
                  >
                    Manual Calculator
                  </Link>
                </div>

                {/* Calculation Info */}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  <p>Calculated: {new Date(creditCalculation.calculation_date).toLocaleString()}</p>
                  <p>Method: {creditCalculation.methodology}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🌱</div>
                <p className="mb-2">No carbon credit calculation yet</p>
                <p className="text-sm">Click the calculate button to generate credits</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href={`/plots/${params.id}/trees`}
            className="bg-green-100 hover:bg-green-200 text-green-800 rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-1">🌳 View Trees</h3>
            <p className="text-sm">Manage tree data</p>
          </Link>

          <Link
            href={`/plots/${params.id}/estimation`}
            className="bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-1">📊 Biomass Est.</h3>
            <p className="text-sm">Run estimation</p>
          </Link>

          <Link
            href={`/plots/${params.id}/estimates`}
            className="bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-1">🍃 Carbon Data</h3>
            <p className="text-sm">View estimates</p>
          </Link>

          <Link
            href={`/plots/${params.id}/export`}
            className="bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-1">📋 Export</h3>
            <p className="text-sm">Registry export</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
