'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { treesAPI, plotsAPI } from '@/lib/api';

type Tree = {
  id: string;
  plot_id: string;
  height_meters: number;
  canopy_cover_m2: number;
  dbh_cm: number;
  species_code: string;
  health_status: string;
  captured_at: string;
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

export default function TreesPage({ params }: PageProps) {
  const { plotId } = params;
  const [plot, setPlot] = useState<Plot | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTree, setNewTree] = useState({
    height_meters: '',
    canopy_cover_m2: '',
    dbh_cm: '',
    species_code: '',
    health_status: 'healthy'
  });
  
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

  // Fetch plot and trees when component mounts
  useEffect(() => {
    if (mounted && isAuthenticated && plotId) {
      loadPlot();
      loadTrees();
    }
  }, [mounted, isAuthenticated, plotId]);

  const loadPlot = async () => {
    try {
      const response = await plotsAPI.getPlotById(plotId);
      setPlot(response.data);
    } catch (err: any) {
      console.error('Error fetching plot:', err);
      setError('Failed to load plot details');
    }
  };

  const loadTrees = async () => {
    try {
      setLoading(true);
      const response = await treesAPI.getTrees(plotId);
      setTrees(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching trees:', err);
      setError(err.message || 'Failed to load tree measurements');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTree(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await treesAPI.addTree(plotId, {
        height_meters: parseFloat(newTree.height_meters),
        canopy_cover_m2: parseFloat(newTree.canopy_cover_m2),
        dbh_cm: parseFloat(newTree.dbh_cm),
        species_code: newTree.species_code,
        health_status: newTree.health_status
      });
      
      // Reset form
      setNewTree({
        height_meters: '',
        canopy_cover_m2: '',
        dbh_cm: '',
        species_code: '',
        health_status: 'healthy'
      });
      
      // Hide form and reload trees
      setShowAddForm(false);
      loadTrees();
    } catch (err: any) {
      console.error('Error creating tree measurement:', err);
      setError(err.response?.data?.error || 'Failed to create tree measurement');
    } finally {
      setLoading(false);
    }
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Tree Measurements</h1>
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
            <h1 className="text-2xl font-bold text-green-800">Tree Measurements</h1>
            {plot && <p className="text-gray-600">Plot: {plot.name}</p>}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {showAddForm ? 'Cancel' : 'Add Tree Measurement'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {showAddForm && (
          <div className="bg-green-50 p-4 rounded-md mb-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">Add Tree Measurement</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="height_meters"
                    value={newTree.height_meters}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    name="dbh_cm"
                    value={newTree.dbh_cm}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 25.3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Canopy Cover (m²)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="canopy_cover_m2"
                    value={newTree.canopy_cover_m2}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 10.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Species Code
                  </label>
                  <input
                    type="text"
                    name="species_code"
                    value={newTree.species_code}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., PISY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Health Status
                  </label>
                  <select
                    name="health_status"
                    value={newTree.health_status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="healthy">Healthy</option>
                    <option value="moderate">Moderate</option>
                    <option value="poor">Poor</option>
                    <option value="dead">Dead</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  {loading ? 'Saving...' : 'Save Measurement'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : trees.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-md text-center">
            <p className="text-gray-600">No tree measurements recorded for this plot yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Species</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Height (m)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">DBH (cm)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Canopy (m²)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trees.map((tree) => (
                  <tr key={tree.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(tree.captured_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{tree.species_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{tree.height_meters}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{tree.dbh_cm}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{tree.canopy_cover_m2}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        tree.health_status === 'healthy' ? 'bg-green-100 text-green-800' :
                        tree.health_status === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        tree.health_status === 'poor' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tree.health_status.charAt(0).toUpperCase() + tree.health_status.slice(1)}
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
  );
}
