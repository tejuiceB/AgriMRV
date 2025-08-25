'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { carbonAPI, plotsAPI } from '@/lib/api';

type Species = {
  code: string;
  commonName: string;
  woodDensity: number;
};

type CarbonEstimate = {
  id: string;
  treeId: string;
  agbKg: number;
  bgbKg?: number;
  carbonKg: number;
  uncPct: number;
  method: string;
  modelVer: string;
  createdAt: string;
};

type Tree = {
  id: string;
  plotId: string;
  speciesCode?: string;
  heightM?: number;
  crownAreaM2?: number;
  dbhCm?: number;
  health?: string;
  sourceRunId?: string;
  createdAt: string;
  updatedAt: string;
  species?: Species;
  estimate?: CarbonEstimate;
};

type EstimateResponse = {
  trees: Tree[];
  totals: {
    totalTrees: number;
    plotAGBTons: number;
    plotCarbonTons: number;
  };
};

export default function EstimatesPage({ params }: { params: { id: string } }) {
  const plotId = params.id;
  const [plot, setPlot] = useState<any>(null);
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  
  // Client-side only code
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load plot details
  useEffect(() => {
    if (mounted && isAuthenticated && plotId) {
      loadPlot();
      loadEstimates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, plotId]);

  const loadPlot = async () => {
    try {
      const response = await plotsAPI.getPlot(plotId);
      setPlot(response.data);
    } catch (err: any) {
      console.error('Error fetching plot:', err);
      setError(err.message || 'Failed to load plot details');
    }
  };

  const loadEstimates = async () => {
    try {
      const response = await carbonAPI.getPlotEstimates(plotId);
      setData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching estimates:', err);
      setError(err.message || 'Failed to load estimates');
    }
  };

  const runEstimation = async () => {
    try {
      setRunning(true);
      setError(null);
      
      // Use the new estimation API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/estimate/plot/${plotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ store_results: true })
      });

      if (!response.ok) {
        throw new Error(`Failed to run estimation: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Reload estimates after successful estimation
        await loadEstimates();
      } else {
        throw new Error(result.error || 'Estimation failed');
      }
    } catch (err: any) {
      console.error('Error running estimates:', err);
      setError(err.message || 'Failed to run carbon estimation');
    } finally {
      setRunning(false);
    }
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Carbon Estimates</h1>
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-2">
          <Link href="/plots" className="text-green-600 hover:text-green-800 mr-2">
            &larr; Back to Plots
          </Link>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-800">
              {plot ? `Carbon Estimates: ${plot.name}` : 'Carbon Estimates'}
            </h1>
            <p className="text-gray-600">View and run carbon estimates for this plot's trees</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/plots/${plotId}/estimation`}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white"
            >
              📊 Advanced Estimation
            </Link>
            <Link
              href={`/plots/${plotId}/export`}
              className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white"
            >
              📋 Registry Export
            </Link>
            <Link
              href={`/plots/${plotId}/mrv`}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              📦 MRV Package
            </Link>
            <button
              onClick={runEstimation}
              disabled={running}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {running ? 'Estimating...' : '🌿 Estimate Carbon'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
              <h2 className="text-lg font-semibold text-green-800 mb-2">Plot Totals</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500 text-sm">Trees</div>
                  <div className="text-xl font-semibold">{data.totals.totalTrees}</div>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500 text-sm">Above-Ground Biomass</div>
                  <div className="text-xl font-semibold">{data.totals.plotAGBTons.toFixed(3)} t</div>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500 text-sm">Carbon Stored</div>
                  <div className="text-xl font-semibold">{data.totals.plotCarbonTons.toFixed(3)} t CO₂</div>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-green-800 mb-3">Tree Estimates</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {data.trees.map((tree: Tree) => (
                <div key={tree.id} className="border border-gray-200 rounded-md p-4 hover:border-green-200 transition-colors">
                  <div className="font-medium text-green-700">
                    {tree.species?.commonName || tree.speciesCode || 'Unknown species'}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Height: {tree.heightM?.toFixed(1) ?? '-'} m • 
                    {tree.dbhCm ? ` DBH: ${tree.dbhCm.toFixed(1)} cm` : ''}
                    {tree.crownAreaM2 ? ` • Crown Area: ${tree.crownAreaM2.toFixed(1)} m²` : ''}
                  </div>
                  
                  {tree.estimate ? (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-gray-500">Biomass</div>
                          <div>{(tree.estimate.agbKg / 1000).toFixed(3)} t</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Carbon</div>
                          <div>{(tree.estimate.carbonKg / 1000).toFixed(3)} t</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Uncertainty</div>
                          <div>±{Math.round((tree.estimate.uncPct) * 100)}%</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Method: {tree.estimate.method} • Version: {tree.estimate.modelVer}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm text-gray-500 italic">
                      No estimate available. Run estimation to calculate carbon.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {data.trees.length === 0 && (
              <div className="bg-gray-50 p-6 rounded-md text-center">
                <p className="text-gray-600">No trees found for this plot.</p>
                <Link
                  href={`/plots/${plotId}/trees`}
                  className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Add Trees First
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
