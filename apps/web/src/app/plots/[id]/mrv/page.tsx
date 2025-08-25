'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { mrvAPI, plotsAPI } from '@/lib/api';

type MRVStatus = {
  pkgId: string;
  hash: string;
  artifactsUri: string;
  ledgerTxId: string;
} | 'running' | null;

type VerifyResult = {
  pkgId: string;
  storedChecksum: string;
  recomputedChecksum: string;
  matches: boolean;
  ledgerTxId: string;
} | null;

export default function MRVPage({ params }: { params: { id: string } }) {
  const plotId = params.id;
  
  const [plot, setPlot] = useState<any>(null);
  const [status, setStatus] = useState<MRVStatus>(null);
  const [verify, setVerify] = useState<VerifyResult>(null);
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

  useEffect(() => {
    if (mounted && isAuthenticated && plotId) {
      loadPlot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, plotId]);

  const loadPlot = async () => {
    try {
      const response = await plotsAPI.getPlot(plotId);
      setPlot(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching plot:', err);
      setError(err.message || 'Failed to load plot details');
    }
  };

  const generateMRV = async () => {
    try {
      setStatus('running');
      setError(null);
      const result = await mrvAPI.exportPackage(plotId);
      setStatus(result.data);
    } catch (err: any) {
      console.error('Error generating MRV package:', err);
      setError(err.message || 'Failed to generate MRV package');
      setStatus(null);
    }
  };

  const verifyIntegrity = async () => {
    if (!status || status === 'running') return;
    
    try {
      setError(null);
      const result = await mrvAPI.verifyPackage(status.pkgId);
      setVerify(result.data);
    } catch (err: any) {
      console.error('Error verifying MRV package:', err);
      setError(err.message || 'Failed to verify MRV package');
      setVerify(null);
    }
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">MRV Package</h1>
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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-800">
            {plot ? `MRV Package: ${plot.name}` : 'MRV Package'}
          </h1>
          <p className="text-gray-600">Generate, anchor, and verify MRV packages for this plot</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={generateMRV}
            disabled={status === 'running'}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {status === 'running' ? 'Generating...' : 'Generate + Anchor Package'}
          </button>
        </div>

        {status && status !== 'running' && (
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-green-700 mb-3">Package Generated</h2>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <div>
                <span className="text-gray-500">Package ID:</span> 
                <span className="ml-2 font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">{status.pkgId}</span>
              </div>
              <div>
                <span className="text-gray-500">Hash:</span> 
                <span className="ml-2 font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">{status.hash}</span>
              </div>
              <div>
                <span className="text-gray-500">Ledger Transaction ID:</span> 
                <span className="ml-2 font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">{status.ledgerTxId}</span>
              </div>
              <div className="truncate">
                <span className="text-gray-500">Artifacts Location:</span> 
                <span className="ml-2 font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">{status.artifactsUri}</span>
              </div>
            </div>

            <button
              onClick={verifyIntegrity}
              className="px-3 py-1.5 rounded border border-green-600 text-green-700 hover:bg-green-50"
            >
              Verify Integrity
            </button>
          </div>
        )}

        {verify && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-green-700 mb-3">Verification Results</h2>
            
            <div className="mb-4">
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">Status:</span>
                {verify.matches ? (
                  <span className="text-green-600 font-semibold flex items-center">
                    <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center">
                    <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Integrity Error
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <div>
                <span className="text-gray-500">Stored Checksum:</span>
                <span className="ml-2 font-mono text-xs bg-gray-100 px-1 py-0.5 rounded break-all">{verify.storedChecksum}</span>
              </div>
              <div>
                <span className="text-gray-500">Recomputed Checksum:</span>
                <span className="ml-2 font-mono text-xs bg-gray-100 px-1 py-0.5 rounded break-all">{verify.recomputedChecksum}</span>
              </div>
              <div>
                <span className="text-gray-500">Ledger Transaction ID:</span>
                <span className="ml-2 font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{verify.ledgerTxId}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
