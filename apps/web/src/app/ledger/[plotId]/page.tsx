'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ledgerAPI, plotsAPI, carbonAPI } from '@/lib/api';

type LedgerEntry = {
  id: string;
  estimate_id: string;
  hash: string;
  block_number: number;
  tx_id: string | null;
  verified_at: string;
};

type CarbonEstimate = {
  id: string;
  tree_id: string;
  biomass_estimate_kg: number;
  carbon_sequestration_kg: number;
  created_at: string;
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

export default function LedgerPage({ params }: PageProps) {
  const { plotId } = params;
  const searchParams = useSearchParams();
  const estimateId = searchParams?.get('estimateId');
  
  const [plot, setPlot] = useState<Plot | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingEstimates, setPendingEstimates] = useState<CarbonEstimate[]>([]);
  const [verifying, setVerifying] = useState(false);
  
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

  // Fetch plot and ledger entries when component mounts
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
      
      // Get all trees for this plot
      const treesResult = await plotResponse.data.trees || [];
      
      // Get all carbon estimates for these trees
      const estimateIds: string[] = [];
      const pendingEstimatesList: CarbonEstimate[] = [];
      
      for (const tree of treesResult) {
        const carbonResponse = await carbonAPI.getCarbonEstimates(tree.id);
        for (const estimate of carbonResponse.data) {
          estimateIds.push(estimate.id);
          pendingEstimatesList.push(estimate);
        }
      }
      
      // Get ledger entries for all estimates
      let allEntries: LedgerEntry[] = [];
      const verifiedEstimateIds = new Set();
      
      for (const id of estimateIds) {
        const ledgerResponse = await ledgerAPI.getLedgerEntries(id);
        if (ledgerResponse.data.length > 0) {
          allEntries = [...allEntries, ...ledgerResponse.data];
          ledgerResponse.data.forEach((entry: LedgerEntry) => {
            verifiedEstimateIds.add(entry.estimate_id);
          });
        }
      }
      
      // Filter out estimates that are already verified
      const pendingEstimates = pendingEstimatesList.filter(
        estimate => !verifiedEstimateIds.has(estimate.id)
      );
      
      setEntries(allEntries);
      setPendingEstimates(pendingEstimates);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const verifyEstimate = async (estimateId: string) => {
    try {
      setVerifying(true);
      await ledgerAPI.createLedgerEntry({ estimate_id: estimateId });
      
      // Reload data after verification
      await loadData();
    } catch (err: any) {
      console.error('Error verifying estimate:', err);
      setError(err.response?.data?.error || 'Failed to verify carbon estimate');
    } finally {
      setVerifying(false);
    }
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Blockchain Verification</h1>
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
            <h1 className="text-2xl font-bold text-green-800">Blockchain Verification</h1>
            {plot && <p className="text-gray-600">Plot: {plot.name}</p>}
          </div>
          <Link
            href={`/carbon/${plotId}`}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Carbon Estimates
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {/* Pending Verifications Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-green-700 mb-4">Pending Verifications</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : pendingEstimates.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-600">No pending carbon estimates to verify.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Carbon (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingEstimates.map((estimate) => (
                    <tr 
                      key={estimate.id} 
                      className={`hover:bg-gray-50 ${estimate.id === estimateId ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(estimate.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {estimate.carbon_sequestration_kg.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => verifyEstimate(estimate.id)}
                          disabled={verifying}
                          className="text-green-600 hover:text-green-900"
                        >
                          {verifying && estimate.id === estimateId ? 'Verifying...' : 'Verify Now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verified Ledger Entries Section */}
        <div>
          <h2 className="text-xl font-semibold text-green-700 mb-4">Verified Carbon Credits</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-600">No verified carbon credits in the ledger yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Block #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Hash</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(entry.verified_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.block_number}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-800">
                        <div className="truncate max-w-xs" title={entry.hash}>
                          {entry.hash.substring(0, 8)}...{entry.hash.substring(entry.hash.length - 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
