'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  // Add a client-side only state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Set mounted state to true after first render on client
    setMounted(true);
    
    // Only redirect to login if not authenticated and not loading
    // This prevents redirect during initial loading when auth state is being determined
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // If not mounted yet, render minimal content to avoid hydration mismatch
  if (!mounted) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-green-800 mb-6">
            AgriMRV Dashboard
          </h1>
          <div className="py-20"></div>
        </div>
      </main>
    );
  }
  
  // If mounted and loading, show spinner
  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-green-800 mb-6">
            AgriMRV Dashboard
          </h1>
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Loading your dashboard...</span>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-green-800 mb-6">
          AgriMRV Dashboard
        </h1>
        
        {isAuthenticated ? (
          <div>
            <div className="bg-green-50 p-4 rounded-md mb-6">
              <p className="text-lg">
                Welcome, <span className="font-semibold">{user?.name}</span>!
              </p>
              <p className="text-sm text-gray-600">
                Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-green-200 rounded-md p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-green-700 mb-2">
                  Manage Plots
                </h2>
                <p className="text-gray-600 mb-4">
                  Create, view, and manage your land plots for carbon monitoring.
                </p>
                <Link
                  href="/plots"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  View Plots
                </Link>
              </div>

              <div className="bg-white border border-green-200 rounded-md p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-green-700 mb-2">
                  Tree Measurements
                </h2>
                <p className="text-gray-600 mb-4">
                  Record and view tree measurements for your plots.
                </p>
                <Link
                  href="/trees"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  View Trees
                </Link>
              </div>

              <div className="bg-white border border-blue-200 rounded-md p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-blue-700 mb-2">
                  💰 Carbon Credits
                </h2>
                <p className="text-gray-600 mb-4">
                  Calculate and monetize your carbon sequestration efforts.
                </p>
                <Link
                  href="/carbon-credits"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  View Credits
                </Link>
              </div>

              <div className="bg-white border border-green-200 rounded-md p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-green-700 mb-2">
                  Carbon Estimates
                </h2>
                <p className="text-gray-600 mb-4">
                  View carbon sequestration estimates for your trees.
                </p>
                <Link
                  href="/carbon"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  View Estimates
                </Link>
              </div>

              <div className="bg-white border border-green-200 rounded-md p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-green-700 mb-2">
                  Blockchain Verification
                </h2>
                <p className="text-gray-600 mb-4">
                  View and verify carbon credits on the blockchain.
                </p>
                <Link
                  href="/ledger"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  View Ledger
                </Link>
              </div>

              <div className="bg-white border border-purple-200 rounded-md p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-purple-700 mb-2">
                  🧮 Calculate Credits
                </h2>
                <p className="text-gray-600 mb-4">
                  Convert biomass measurements into tradeable carbon credits.
                </p>
                <Link
                  href="/carbon-credits/calculate"
                  className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
                >
                  Calculate Now
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-xl mb-4">Please log in to access the dashboard</p>
            <Link
              href="/login"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
