'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ExportPage({ params }: { params: { id: string }}) {
  const plotId = params.id;
  const [val, setVal] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Handle auth
  useState(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  });

  async function validate() {
    setChecking(true);
    try {
      // Log before making the request to help debug
      console.log('Validating exports for plot:', plotId);
      console.log('Using API URL:', `${API}/api/exports/plots/${plotId}/validate`);
      
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);
      
      const res = await fetch(`${API}/api/exports/plots/${plotId}/validate`, { 
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Validation response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error:', res.status, errorText);
        throw new Error(`API returned ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Validation data received:', data);
      setVal(data);
    } catch (error) {
      console.error('Error validating export:', error);
      setVal({ ok: false, issues: ['Failed to validate export data'] });
    } finally {
      setChecking(false);
    }
  }

  async function downloadCsvZip() {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch the file using proper headers
      const response = await fetch(`${API}/api/exports/plots/${plotId}/csv.zip`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Error downloading CSV:', response.status);
        alert('Failed to download export. Please try again.');
        return;
      }
      
      // Convert the response to a blob
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `plot_${plotId}_export.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download export. Please try again.');
    }
  }
  
  async function downloadJson() {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch the file using proper headers
      const response = await fetch(`${API}/api/exports/plots/${plotId}.json`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Error downloading JSON:', response.status);
        alert('Failed to download export. Please try again.');
        return;
      }
      
      // Convert the response to a blob
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `plot_${plotId}_export.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading JSON:', error);
      alert('Failed to download export. Please try again.');
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6 justify-between">
          <Link href={`/plots/${plotId}`} className="text-green-600 hover:text-green-800 mr-2">
            &larr; Back to Plot
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-800">📊 Registry Export</h1>
          <p className="text-gray-600">Create registry-ready exports for your plot data</p>
        </div>

        <div className="mb-6">
          <button 
            onClick={validate} 
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold" 
            disabled={checking}
          >
            {checking ? '🔄 Validating...' : '✅ Validate Data'}
          </button>
        </div>

        {val && (
          <div className={`border rounded p-4 ${val.ok ? 'border-green-500' : 'border-red-500'}`}>
            <div className="font-semibold mb-2">Validation Results</div>
            <div className="mb-1">Status: {val.ok ? 
              <span className="text-green-600 font-medium">READY FOR EXPORT</span> : 
              <span className="text-red-600 font-medium">ISSUES FOUND</span>}
            </div>
            <div className="mb-2">Trees: {val.counts?.trees ?? 0}</div>
            
            {!val.ok && val.issues && val.issues.length > 0 && (
              <div className="mt-2 mb-4">
                <div className="text-red-600 font-medium">Issues to resolve:</div>
                <ul className="list-disc ml-5 mt-2 text-sm text-red-600">
                  {val.issues.map((issue: string, idx: number) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {val.ok && (
              <div className="mt-4">
                <div className="font-medium mb-2">Your data is ready for export!</div>
                <p className="text-sm text-gray-600 mb-3">
                  Choose an export format below. CSV exports are provided as a ZIP file with multiple files.
                  JSON format is suitable for API integrations.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={downloadCsvZip} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center"
                    disabled={!val.ok}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    📊 Download CSV (ZIP)
                  </button>
                  <button 
                    onClick={downloadJson} 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center"
                    disabled={!val.ok}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    📄 Download JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">About Registry Exports</h2>
          <p className="text-gray-700 text-sm">
            Registry exports convert your plot and tree data into standardized formats that can be 
            submitted to carbon registries. These exports include essential measurements, estimates,
            and metadata required for verification.
          </p>
          <div className="mt-3 text-sm">
            <div className="font-medium">Export formats include:</div>
            <ul className="list-disc ml-5 mt-1">
              <li>CSV format (multiple files in ZIP archive)</li>
              <li>JSON format (complete data in a single file)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
