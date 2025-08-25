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

export default function TreesIndexPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch plots when component mounts
  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      loadPlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <Link href="/" className="text-green-600 hover:text-green-800 mr-2">
            &larr; Back to Dashboard
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-800">Tree Measurements</h1>
          <p className="text-gray-600">Select a plot to manage tree measurements</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : plots.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-md text-center">
            <p className="text-gray-600">You haven't added any plots yet.</p>
            <Link
              href="/plots"
              className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Add a Plot First
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plots.map((plot) => (
              <Link
                key={plot.id}
                href={`/plots/${plot.id}/trees`}
                className="block border border-gray-200 rounded-md p-4 hover:bg-green-50 hover:border-green-200 transition-colors"
              >
                <h2 className="text-lg font-semibold text-green-700 mb-1">{plot.name}</h2>
                <p className="text-gray-600 mb-1">Area: {plot.area_hectares} ha</p>
                <p className="text-gray-500 text-sm">
                  Location: {typeof plot.latitude === 'number' ? plot.latitude.toFixed(4) : plot.latitude}, {typeof plot.longitude === 'number' ? plot.longitude.toFixed(4) : plot.longitude}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
