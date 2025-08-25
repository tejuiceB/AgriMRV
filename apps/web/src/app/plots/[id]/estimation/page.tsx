'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

type Species = {
  id: number;
  species_code: string;
  common_name: string;
  scientific_name: string;
  wood_density_kg_m3: number;
  uncertainty_pct: number;
};

type Tree = {
  id: string;
  species_code?: string;
  height_meters?: number;
  dbh_cm?: number;
  canopy_cover_m2?: number;
  health_status?: string;
};

type Estimate = {
  biomass_estimate_kg: number;
  carbon_sequestration_kg: number;
  co2_equivalent_kg: number;
  uncertainty_pct: number;
  method: string;
  confidence_pct: number;
  species_data?: Species;
};

type PlotSummary = {
  total_trees: number;
  estimated_trees: number;
  pending_estimation: number;
  total_biomass_kg: number;
  total_carbon_kg: number;
  total_co2_equivalent_kg: number;
  total_biomass_tons: number;
  total_carbon_tons: number;
  total_co2_equivalent_tons: number;
};

export default function EstimationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Data states
  const [plot, setPlot] = useState<any>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [summary, setSummary] = useState<PlotSummary | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrees, setSelectedTrees] = useState<string[]>([]);
  
  // Individual estimation states
  const [showManualEstimation, setShowManualEstimation] = useState(false);
  const [manualData, setManualData] = useState({
    height_meters: '',
    dbh_cm: '',
    canopy_cover_m2: '',
    species_code: ''
  });
  const [manualResult, setManualResult] = useState<Estimate | null>(null);

  const plotId = params.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      loadData();
    }
  }, [mounted, isAuthenticated, user, plotId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load plot summary
      const summaryResponse = await api.get(`/api/estimate/plot/${plotId}/summary`);
      if (summaryResponse.data.success) {
        setPlot(summaryResponse.data.plot);
        setSummary(summaryResponse.data.summary);
        setTrees(summaryResponse.data.trees);
      }
      
      // Load species data
      const speciesResponse = await api.get('/api/estimate/species');
      if (speciesResponse.data.success) {
        setSpecies(speciesResponse.data.species);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const runPlotEstimation = async () => {
    try {
      setEstimating(true);
      const response = await api.post(`/api/estimate/plot/${plotId}`, {
        store_results: true
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        await loadData(); // Refresh data
      } else {
        toast.error('Estimation failed');
      }
    } catch (err: any) {
      console.error('Error running plot estimation:', err);
      toast.error(err.response?.data?.error || 'Failed to run estimation');
    } finally {
      setEstimating(false);
    }
  };

  const runIndividualEstimation = async (treeId: string) => {
    try {
      const response = await api.post(`/api/estimate/tree/${treeId}`);
      
      if (response.data.success) {
        toast.success(`Estimation completed for tree ${treeId}`);
        await loadData(); // Refresh data
      } else {
        toast.error('Estimation failed');
      }
    } catch (err: any) {
      console.error('Error running individual estimation:', err);
      toast.error(err.response?.data?.error || 'Failed to run estimation');
    }
  };

  const runManualEstimation = async () => {
    try {
      const response = await api.post('/api/estimate', {
        height_meters: manualData.height_meters ? parseFloat(manualData.height_meters) : undefined,
        dbh_cm: manualData.dbh_cm ? parseFloat(manualData.dbh_cm) : undefined,
        canopy_cover_m2: manualData.canopy_cover_m2 ? parseFloat(manualData.canopy_cover_m2) : undefined,
        species_code: manualData.species_code || undefined
      });
      
      if (response.data.success) {
        setManualResult(response.data.estimate);
        toast.success('Manual estimation completed');
      } else {
        toast.error('Manual estimation failed');
      }
    } catch (err: any) {
      console.error('Error running manual estimation:', err);
      toast.error(err.response?.data?.error || 'Failed to run manual estimation');
    }
  };

  // Loading states
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">🌿 Biomass & Carbon Estimation</h1>
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">🌿 Biomass & Carbon Estimation</h1>
          <p className="text-gray-600">Please log in to access estimation features.</p>
          <Link href="/login" className="text-green-600 hover:text-green-700 underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-800">🌿 Biomass & Carbon Estimation</h1>
            <p className="text-gray-600">
              Plot: <span className="font-semibold">{plot?.name}</span>
            </p>
          </div>
          <Link 
            href={`/plots/${plotId}`}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            ← Back to Plot
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800">Total Trees</h3>
                  <p className="text-2xl font-bold text-green-900">{summary.total_trees}</p>
                  <p className="text-sm text-green-600">
                    {summary.estimated_trees} estimated, {summary.pending_estimation} pending
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800">Biomass</h3>
                  <p className="text-2xl font-bold text-blue-900">{summary.total_biomass_tons} t</p>
                  <p className="text-sm text-blue-600">{summary.total_biomass_kg} kg total</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-purple-800">Carbon Stored</h3>
                  <p className="text-2xl font-bold text-purple-900">{summary.total_carbon_tons} t</p>
                  <p className="text-sm text-purple-600">{summary.total_carbon_kg} kg carbon</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-orange-800">CO₂ Equivalent</h3>
                  <p className="text-2xl font-bold text-orange-900">{summary.total_co2_equivalent_tons} t</p>
                  <p className="text-sm text-orange-600">{summary.total_co2_equivalent_kg} kg CO₂</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={runPlotEstimation}
                disabled={estimating}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
              >
                {estimating ? '🔄 Running Estimation...' : '🚀 Run Plot Estimation'}
              </button>
              
              <button
                onClick={() => setShowManualEstimation(!showManualEstimation)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                🧮 Manual Estimation
              </button>
              
              <Link
                href={`/plots/${plotId}/export`}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center"
              >
                📋 Registry Export
              </Link>
              
              <button
                onClick={loadData}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                🔄 Refresh Data
              </button>
            </div>

            {/* Manual Estimation Panel */}
            {showManualEstimation && (
              <div className="bg-gray-50 border rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🧮 Manual Estimation Tool</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Test the estimation engine with custom measurements. At least one measurement is required.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (meters)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualData.height_meters}
                      onChange={(e) => setManualData({...manualData, height_meters: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 5.2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DBH (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualData.dbh_cm}
                      onChange={(e) => setManualData({...manualData, dbh_cm: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 25.4"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Canopy Cover (m²)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualData.canopy_cover_m2}
                      onChange={(e) => setManualData({...manualData, canopy_cover_m2: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 12.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Species
                    </label>
                    <select
                      value={manualData.species_code}
                      onChange={(e) => setManualData({...manualData, species_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Species</option>
                      {species.map((s) => (
                        <option key={s.species_code} value={s.species_code}>
                          {s.common_name} ({s.species_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={runManualEstimation}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Calculate Estimate
                  </button>
                  <button
                    onClick={() => {
                      setManualData({height_meters: '', dbh_cm: '', canopy_cover_m2: '', species_code: ''});
                      setManualResult(null);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    Clear
                  </button>
                </div>
                
                {manualResult && (
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Estimation Result:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Biomass:</strong> {manualResult.biomass_estimate_kg} kg
                      </div>
                      <div>
                        <strong>Carbon:</strong> {manualResult.carbon_sequestration_kg} kg
                      </div>
                      <div>
                        <strong>CO₂ Equivalent:</strong> {manualResult.co2_equivalent_kg} kg
                      </div>
                      <div>
                        <strong>Method:</strong> {manualResult.method}
                      </div>
                      <div>
                        <strong>Confidence:</strong> {manualResult.confidence_pct}%
                      </div>
                      <div>
                        <strong>Uncertainty:</strong> ±{manualResult.uncertainty_pct}%
                      </div>
                    </div>
                    {manualResult.species_data && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Species:</strong> {manualResult.species_data.common_name} 
                        (Wood density: {manualResult.species_data.wood_density_kg_m3} kg/m³)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trees List */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Tree Estimates</h2>
              
              {trees.length === 0 ? (
                <div className="bg-gray-50 border rounded-lg p-6 text-center">
                  <p className="text-gray-600">No trees found for this plot.</p>
                  <Link
                    href={`/plots/${plotId}/trees`}
                    className="text-green-600 hover:text-green-700 underline"
                  >
                    Add trees to get started
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {trees.map((tree: any) => (
                    <div key={tree.tree_id} className="border rounded-lg p-4 hover:border-green-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="font-semibold text-gray-800">
                              Tree {tree.tree_id}
                            </h3>
                            {tree.species_code && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                {tree.species_code}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <strong>Height:</strong> {tree.height_meters ? `${tree.height_meters} m` : 'Not recorded'}
                            </div>
                            <div>
                              <strong>DBH:</strong> {tree.dbh_cm ? `${tree.dbh_cm} cm` : 'Not recorded'}
                            </div>
                            <div>
                              <strong>Canopy:</strong> {tree.canopy_cover_m2 ? `${tree.canopy_cover_m2} m²` : 'Not recorded'}
                            </div>
                          </div>
                          
                          {tree.biomass_estimate_kg ? (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <strong className="text-green-800">Biomass:</strong>
                                  <br />
                                  {tree.biomass_estimate_kg} kg
                                </div>
                                <div>
                                  <strong className="text-green-800">Carbon:</strong>
                                  <br />
                                  {tree.carbon_sequestration_kg} kg
                                </div>
                                <div>
                                  <strong className="text-green-800">CO₂ Equivalent:</strong>
                                  <br />
                                  {Math.round(tree.carbon_sequestration_kg * 3.67 * 100) / 100} kg
                                </div>
                                <div>
                                  <strong className="text-green-800">Method:</strong>
                                  <br />
                                  {tree.method || 'N/A'}
                                  <br />
                                  <span className="text-xs text-gray-600">
                                    Confidence: {tree.confidence_pct || 'N/A'}%
                                  </span>
                                </div>
                              </div>
                              {tree.estimate_date && (
                                <div className="mt-2 text-xs text-gray-500">
                                  Estimated: {new Date(tree.estimate_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                              <p className="text-yellow-800 text-sm">No estimation available</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <button
                            onClick={() => runIndividualEstimation(tree.tree_id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            {tree.biomass_estimate_kg ? 'Re-estimate' : 'Estimate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
