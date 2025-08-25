'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { carbonAPI, plotsAPI, treesAPI } from '@/lib/api';

type CarbonEstimate = {
  id: string;
  tree_id: string;
  biomass_estimate_kg: number;
  carbon_sequestration_kg: number;
  method: string;
  confidence_pct: number;
  created_at: string;
};

type Tree = {
  id: string;
  species_code: string;
  height_meters: number;
};

type Plot = {
  id: string;
  name: string;
  user_id: string;
};

type PageProps = {
  params: {
    plotId: string;
  };
};

export default function CarbonPage({ params }: PageProps) {
  const { plotId } = params;
  const [plot, setPlot] = useState<Plot | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [estimates, setEstimates] = useState<CarbonEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCarbon, setTotalCarbon] = useState<number>(0);
  
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

  // Fetch plot, trees and carbon estimates when component mounts
  useEffect(() => {
    if (mounted && isAuthenticated && plotId) {
      loadData();
    }
  }, [mounted, isAuthenticated, plotId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get plot data
      const plotResponse = await plotsAPI.getPlotById(plotId);
      setPlot(plotResponse.data);
      
      // Get trees for this plot
      const treesResponse = await treesAPI.getTrees(plotId);
      setTrees(treesResponse.data);
      
      // Get carbon estimates for all trees in this plot
      let allEstimates: CarbonEstimate[] = [];
      let totalSequestration = 0;
      
      for (const tree of treesResponse.data) {
        const estimatesResponse = await carbonAPI.getCarbonEstimates(tree.id);
        
        if (estimatesResponse.data.length > 0) {
          // Get the latest estimate for each tree
          const latestEstimate = estimatesResponse.data[0];
          allEstimates.push(latestEstimate);
          
          // Add to total sequestration
          totalSequestration += latestEstimate.carbon_sequestration_kg;
        }
      }
      
      setEstimates(allEstimates);
      setTotalCarbon(totalSequestration);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load carbon estimates');
    } finally {
      setLoading(false);
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
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-800">Carbon Estimates</h1>
            {plot && <p className="text-gray-600">Plot: {plot.name}</p>}
          </div>
          <Link
            href={`/trees/${plotId}`}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Add Tree Data
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        <div className="bg-green-50 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Total Carbon Sequestered</h2>
          <div className="text-3xl font-bold text-green-700">
            {totalCarbon.toFixed(2)} kg
            <span className="text-sm font-normal text-green-600 ml-2">
              ({(totalCarbon / 1000).toFixed(2)} tonnes)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : estimates.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-md text-center">
            <p className="text-gray-600">No carbon estimates available for this plot yet.</p>
            <p className="text-gray-500 mt-2">Add tree measurements to generate carbon estimates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Tree Species</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Biomass (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Carbon (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {estimates.map((estimate) => {
                  // Find tree info
                  const tree = trees.find(t => t.id === estimate.tree_id);
                  
                  return (
                    <tr key={estimate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(estimate.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tree?.species_code || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {estimate.biomass_estimate_kg.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {estimate.carbon_sequestration_kg.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {estimate.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div 
                            className={`h-2.5 rounded-full ${
                              estimate.confidence_pct > 80 ? 'bg-green-600' : 
                              estimate.confidence_pct > 50 ? 'bg-yellow-400' : 
                              'bg-orange-500'
                            }`}
                            style={{width: `${estimate.confidence_pct}%`}}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{estimate.confidence_pct}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/ledger/${plotId}?estimateId=${estimate.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Verify
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
