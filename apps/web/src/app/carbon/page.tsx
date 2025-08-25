'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface Plot {
  id: string;
  name: string;
  area_hectares: number;
  tree_count?: number;
  total_biomass?: number;
  total_carbon?: number;
}

interface CarbonEstimate {
  id: string;
  plot_id: string;
  plot_name: string;
  tree_id: string;
  species_code: string;
  height_meters: number;
  biomass_estimate_kg: number;
  carbon_sequestration_kg: number;
  method: string;
  confidence_pct: number;
  created_at: string;
}

interface CarbonSummary {
  total_plots: number;
  total_trees: number;
  total_biomass_kg: number;
  total_carbon_kg: number;
  total_carbon_tons: number;
  avg_carbon_per_tree: number;
  avg_carbon_per_hectare: number;
}

export default function CarbonEstimatesPage() {
  const { isAuthenticated, user, token } = useAuth();
  const router = useRouter();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [estimates, setEstimates] = useState<CarbonEstimate[]>([]);
  const [summary, setSummary] = useState<CarbonSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchCarbonData();
  }, [isAuthenticated, token]);

  const fetchCarbonData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's plots
      const plotsResponse = await fetch('http://localhost:4000/api/plots', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (plotsResponse.ok) {
        const plotsData = await plotsResponse.json();
        
        // Fetch carbon estimates for each plot
        let allEstimates: CarbonEstimate[] = [];
        let enrichedPlots: Plot[] = [];
        
        for (const plot of plotsData) {
          try {
            // Get trees for this plot
            const treesResponse = await fetch(`http://localhost:4000/api/trees/plot/${plot.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            let plotTreeCount = 0;
            let plotBiomass = 0;
            let plotCarbon = 0;

            if (treesResponse.ok) {
              const treesData = await treesResponse.json();
              plotTreeCount = treesData.length;

              // Get carbon estimates for each tree
              for (const tree of treesData) {
                try {
                  const carbonResponse = await fetch(`http://localhost:4000/api/carbon/estimates/${tree.id}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });

                  if (carbonResponse.ok) {
                    const carbonData = await carbonResponse.json();
                    if (carbonData.length > 0) {
                      // Get the latest estimate
                      const latestEstimate = carbonData[0];
                      
                      allEstimates.push({
                        ...latestEstimate,
                        plot_id: plot.id,
                        plot_name: plot.name,
                        species_code: tree.species_code,
                        height_meters: tree.height_meters
                      });

                      plotBiomass += latestEstimate.biomass_estimate_kg;
                      plotCarbon += latestEstimate.carbon_sequestration_kg;
                    }
                  }
                } catch (err) {
                  console.warn(`Failed to fetch carbon estimates for tree ${tree.id}`);
                }
              }
            }

            enrichedPlots.push({
              ...plot,
              tree_count: plotTreeCount,
              total_biomass: plotBiomass,
              total_carbon: plotCarbon
            });

          } catch (err) {
            console.warn(`Failed to fetch data for plot ${plot.id}`);
            enrichedPlots.push(plot);
          }
        }

        setPlots(enrichedPlots);
        setEstimates(allEstimates);

        // Calculate summary
        const totalCarbon = allEstimates.reduce((sum, est) => sum + est.carbon_sequestration_kg, 0);
        const totalBiomass = allEstimates.reduce((sum, est) => sum + est.biomass_estimate_kg, 0);
        const totalArea = enrichedPlots.reduce((sum, plot) => sum + (plot.area_hectares || 0), 0);

        setSummary({
          total_plots: enrichedPlots.length,
          total_trees: allEstimates.length,
          total_biomass_kg: totalBiomass,
          total_carbon_kg: totalCarbon,
          total_carbon_tons: totalCarbon / 1000,
          avg_carbon_per_tree: allEstimates.length > 0 ? totalCarbon / allEstimates.length : 0,
          avg_carbon_per_hectare: totalArea > 0 ? totalCarbon / totalArea : 0
        });
      }

    } catch (err) {
      console.error('Error fetching carbon data:', err);
      setError('Failed to load carbon estimates');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-green-800 mb-6">
            🍃 Carbon Estimates
          </h1>
          <div className="py-20"></div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-4">Please log in to view carbon estimates.</p>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Loading carbon estimates...</span>
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
            🍃 Carbon Estimates
          </h1>
          <div className="flex space-x-3">
            <Link
              href="/carbon-credits"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
            >
              💰 View Credits
            </Link>
            <Link
              href="/plots"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Back to Plots
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Total Carbon</h3>
              <p className="text-3xl font-bold text-green-600">
                {summary.total_carbon_kg.toFixed(1)} kg
              </p>
              <p className="text-sm text-gray-600">({summary.total_carbon_tons.toFixed(2)} tonnes)</p>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Trees</h3>
              <p className="text-3xl font-bold text-blue-600">
                {summary.total_trees}
              </p>
              <p className="text-sm text-gray-600">across {summary.total_plots} plots</p>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Avg per Tree</h3>
              <p className="text-3xl font-bold text-purple-600">
                {summary.avg_carbon_per_tree.toFixed(1)} kg
              </p>
              <p className="text-sm text-gray-600">carbon sequestered</p>
            </div>

            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">Avg per Hectare</h3>
              <p className="text-3xl font-bold text-orange-600">
                {summary.avg_carbon_per_hectare.toFixed(1)} kg
              </p>
              <p className="text-sm text-gray-600">carbon density</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Potential Credits</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {(summary.total_carbon_kg * 3.67 / 1000).toFixed(3)}
              </p>
              <p className="text-sm text-gray-600">CO₂ equivalent credits</p>
            </div>
          </div>
        )}

        {/* Carbon Credit Potential */}
        {summary && summary.total_carbon_kg > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-green-800 mb-4">
              💰 Carbon Credit Potential
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">CO₂ Equivalent</h3>
                <p className="text-2xl font-bold text-green-600">
                  {(summary.total_carbon_kg * 3.67 / 1000).toFixed(3)} credits
                </p>
                <p className="text-sm text-gray-600">Based on IPCC conversion (×3.67)</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Estimated Value (USD)</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ${((summary.total_carbon_kg * 3.67 / 1000) * 8.5).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">At $8.50 per credit (market avg)</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Estimated Value (INR)</h3>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{((summary.total_carbon_kg * 3.67 / 1000) * 700).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">At ₹700 per credit (market avg)</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/carbon-credits/calculate"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
              >
                🧮 Calculate Exact Credits
              </Link>
            </div>
          </div>
        )}

        {/* Plot Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📊 Carbon by Plot
          </h2>
          
          {plots.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Plot Name</th>
                    <th className="text-left py-3 px-4">Area (ha)</th>
                    <th className="text-left py-3 px-4">Trees</th>
                    <th className="text-left py-3 px-4">Biomass (kg)</th>
                    <th className="text-left py-3 px-4">Carbon (kg)</th>
                    <th className="text-left py-3 px-4">Density (kg/ha)</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plots.map((plot) => (
                    <tr key={plot.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{plot.name}</td>
                      <td className="py-3 px-4">{plot.area_hectares}</td>
                      <td className="py-3 px-4">{plot.tree_count || 0}</td>
                      <td className="py-3 px-4">
                        {plot.total_biomass ? plot.total_biomass.toFixed(1) : '0.0'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-green-600">
                        {plot.total_carbon ? plot.total_carbon.toFixed(1) : '0.0'}
                      </td>
                      <td className="py-3 px-4">
                        {plot.total_carbon && plot.area_hectares 
                          ? (plot.total_carbon / plot.area_hectares).toFixed(1)
                          : '0.0'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link
                            href={`/carbon/${plot.id}`}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Details
                          </Link>
                          <Link
                            href={`/plots/${plot.id}/carbon-credits`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Credits
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No plots with carbon estimates yet</p>
              <Link
                href="/plots"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
              >
                Add Your First Plot
              </Link>
            </div>
          )}
        </div>

        {/* Recent Estimates */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              📈 Recent Carbon Estimates
            </h2>
            <span className="text-sm text-gray-500">
              Showing latest estimates per tree
            </span>
          </div>

          {estimates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Plot</th>
                    <th className="text-left py-3 px-4">Species</th>
                    <th className="text-left py-3 px-4">Height (m)</th>
                    <th className="text-left py-3 px-4">Biomass (kg)</th>
                    <th className="text-left py-3 px-4">Carbon (kg)</th>
                    <th className="text-left py-3 px-4">Method</th>
                    <th className="text-left py-3 px-4">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 15)
                    .map((estimate) => (
                    <tr key={estimate.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(estimate.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <Link 
                          href={`/carbon/${estimate.plot_id}`}
                          className="text-green-600 hover:text-green-700"
                        >
                          {estimate.plot_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{estimate.species_code}</td>
                      <td className="py-3 px-4">{estimate.height_meters}</td>
                      <td className="py-3 px-4">{estimate.biomass_estimate_kg.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-green-600">
                        {estimate.carbon_sequestration_kg.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">{estimate.method}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                estimate.confidence_pct > 80 ? 'bg-green-600' : 
                                estimate.confidence_pct > 50 ? 'bg-yellow-400' : 
                                'bg-orange-500'
                              }`}
                              style={{width: `${estimate.confidence_pct}%`}}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{estimate.confidence_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🌱</div>
              <p className="text-gray-600 mb-2">No carbon estimates yet</p>
              <p className="text-sm text-gray-500 mb-4">Add tree measurements to start tracking carbon sequestration</p>
              <Link
                href="/trees"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
              >
                Add Tree Data
              </Link>
            </div>
          )}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link
            href="/carbon-credits"
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-2">💰 Calculate Credits</h3>
            <p className="text-sm opacity-90">Monetize your carbon sequestration</p>
          </Link>

          <Link
            href="/plots"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-2">🌱 Manage Plots</h3>
            <p className="text-sm opacity-90">Add more plots and trees</p>
          </Link>

          <Link
            href="/ledger"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 text-center transition-colors"
          >
            <h3 className="font-semibold mb-2">🔗 Blockchain</h3>
            <p className="text-sm opacity-90">Verify on blockchain</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
