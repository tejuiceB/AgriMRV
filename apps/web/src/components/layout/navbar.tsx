'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  // Add a client-side only state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Only render the auth-dependent parts after mounting on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="bg-green-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          AgriMRV
        </Link>
        
        {/* Only render auth-dependent UI after client-side mount */}
        <div className="flex items-center space-x-4">
          {mounted && isAuthenticated && (
            <>
              <div className="hidden md:flex space-x-4">
                <Link href="/plots" className="hover:text-green-200 transition-colors">
                  Plots
                </Link>
                <Link href="/carbon" className="hover:text-green-200 transition-colors">
                  🍃 Carbon
                </Link>
                <Link href="/carbon-credits" className="hover:text-green-200 transition-colors">
                  💰 Credits
                </Link>
                <Link href="/blockchain" className="hover:text-green-200 transition-colors">
                  🔗 Blockchain
                </Link>
                <Link href="/trees" className="hover:text-green-200 transition-colors">
                  Trees
                </Link>
              </div>
              <span className="text-sm hidden lg:inline">
                Signed in as {user?.name}
              </span>
              <button
                onClick={logout}
                className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
