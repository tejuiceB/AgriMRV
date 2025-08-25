'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { plotsAPI } from '@/lib/api';

type Plot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  created_at: string;
  user_id: string;
};

export default function PlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlot, setNewPlot] = useState({
    name: '',
    latitude: '',
    longitude: '',
    area_hectares: ''
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

  // Fetch plots when component mounts
  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      loadPlots();
    }
  }, [mounted, isAuthenticated, user]);

  const loadPlots = async () => {
    try {
      setLoading(true);
      const response = await plotsAPI.getPlots(user?.id);
      setPlots(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching plots:', err);
      setError(err.message || 'Failed to load plots');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlot(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await plotsAPI.createPlot({
        user_id: user?.id,
        name: newPlot.name,
        latitude: parseFloat(newPlot.latitude),
        longitude: parseFloat(newPlot.longitude),
        area_hectares: parseFloat(newPlot.area_hectares)
      });
      
      // Reset form
      setNewPlot({
        name: '',
        latitude: '',
        longitude: '',
        area_hectares: ''
      });
      
      // Hide form and reload plots
      setShowAddForm(false);
      loadPlots();
    } catch (err: any) {
      console.error('Error creating plot:', err);
      setError(err.response?.data?.error || 'Failed to create plot');
    } finally {
      setLoading(false);
    }
  };

  // Loading/mounting state
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-green-800 mb-6">My Plots</h1>
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-green-800">My Plots</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {showAddForm ? 'Cancel' : 'Add New Plot'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {showAddForm && (
          <div className="bg-green-50 p-4 rounded-md mb-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">Add New Plot</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newPlot.name}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., North Field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area (hectares)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="area_hectares"
                    value={newPlot.area_hectares}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 5.2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    name="latitude"
                    value={newPlot.latitude}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 37.7749"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    name="longitude"
                    value={newPlot.longitude}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., -122.4194"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  {loading ? 'Saving...' : 'Save Plot'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : plots.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-md text-center">
            <p className="text-gray-600">You haven't added any plots yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Area (ha)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plots.map((plot) => (
                  <tr key={plot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{plot.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{plot.area_hectares}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {plot.latitude !== undefined && plot.latitude !== null
                        ? (typeof plot.latitude === 'number' 
                          ? plot.latitude.toFixed(4) 
                          : Number(plot.latitude).toFixed(4))
                        : 'N/A'}, 
                      {plot.longitude !== undefined && plot.longitude !== null
                        ? (typeof plot.longitude === 'number' 
                          ? plot.longitude.toFixed(4) 
                          : Number(plot.longitude).toFixed(4))
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/plots/${plot.id}/trees`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Trees
                        </Link>
                        <Link
                          href={`/plots/${plot.id}/images`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Images
                        </Link>
                        <Link
                          href={`/plots/${plot.id}/estimation`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Estimation
                        </Link>
                        <Link
                          href={`/plots/${plot.id}/estimates`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Carbon
                        </Link>
                        <Link
                          href={`/plots/${plot.id}/carbon-credits`}
                          className="text-yellow-600 hover:text-yellow-900 font-semibold"
                        >
                          💰 Credits
                        </Link>
                        <Link
                          href={`/plots/${plot.id}/export`}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Registry Export
                        </Link>
                        <Link
                          href={`/plots/${plot.id}/mrv`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          MRV
                        </Link>
                      </div>
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
