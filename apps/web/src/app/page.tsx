'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for token in localStorage (simple auth check)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              🌱 AgriMRV
            </h1>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6 animate-pulse">
            🌱 AgriMRV
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            Carbon Monitoring, Reporting & Verification Platform for Agriculture
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
            Leveraging AI, Blockchain, and Digital Public Infrastructure for transparent, 
            low-cost, and scalable carbon credit management
          </p>
          
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              🚀 Get Started
            </Link>
            {!isLoggedIn && (
              <Link
                href="/register"
                className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200"
              >
                📝 Register
              </Link>
            )}
            <Link
              href="/blockchain"
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              ⛓️ Blockchain
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* CORE Features */}
          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-emerald-100 hover:border-emerald-300">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl text-white">🌾</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-emerald-700 transition-colors">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium mr-2">CORE</span>
              Plot Management
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Comprehensive land plot registration, mapping, and management system for agricultural monitoring
            </p>
            <Link
              href="/plots"
              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold group-hover:underline"
            >
              Manage Plots 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-blue-100 hover:border-blue-300">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl text-white">🌳</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-blue-700 transition-colors">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-2">MONITOR</span>
              Tree Tracking
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Advanced tree measurement and growth monitoring with AI-powered biomass estimation
            </p>
            <Link
              href="/trees"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold group-hover:underline"
            >
              Track Trees 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-amber-100 hover:border-amber-300">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl text-white">💰</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-amber-700 transition-colors">
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium mr-2">REVENUE</span>
              Carbon Credits
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Convert your environmental impact into tradeable carbon credits with marketplace integration
            </p>
            <Link
              href="/carbon-credits"
              className="inline-flex items-center text-amber-600 hover:text-amber-700 font-semibold group-hover:underline"
            >
              View Credits 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-purple-100 hover:border-purple-300">
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl text-white">⛓️</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-purple-700 transition-colors">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-2">VERIFY</span>
              Blockchain Ledger
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Immutable verification and transparency using Polygon blockchain for carbon record storage
            </p>
            <Link
              href="/ledger"
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-semibold group-hover:underline"
            >
              View Ledger 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-indigo-100 hover:border-indigo-300">
            <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl text-white">🧮</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-indigo-700 transition-colors">
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium mr-2">CALCULATE</span>
              Carbon Estimation
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              AI-powered satellite imagery analysis for accurate biomass and carbon sequestration calculations
            </p>
            <Link
              href="/carbon"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-semibold group-hover:underline"
            >
              View Estimates 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-teal-100 hover:border-teal-300">
            <div className="bg-gradient-to-br from-teal-400 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl text-white">📊</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-teal-700 transition-colors">
              <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium mr-2">INSIGHTS</span>
              Analytics Dashboard
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Comprehensive analytics and reporting for monitoring environmental impact and compliance
            </p>
            <Link
              href="/carbon-credits/calculate"
              className="inline-flex items-center text-teal-600 hover:text-teal-700 font-semibold group-hover:underline"
            >
              View Analytics 
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Technology Highlights */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-gray-200">
          <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-12">
            🚀 Powered by Advanced Technology
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:shadow-lg">
                <span className="text-3xl text-white">🤖</span>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">AI & ML</h3>
              <p className="text-gray-600 text-sm">Satellite imagery analysis with PyTorch models</p>
            </div>
            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:shadow-lg">
                <span className="text-3xl text-white">⛓️</span>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Blockchain</h3>
              <p className="text-gray-600 text-sm">Polygon network for immutable records</p>
            </div>
            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:shadow-lg">
                <span className="text-3xl text-white">🛰️</span>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Satellite Data</h3>
              <p className="text-gray-600 text-sm">Real-time monitoring and verification</p>
            </div>
            <div className="group hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:shadow-lg">
                <span className="text-3xl text-white">🔗</span>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">DPI APIs</h3>
              <p className="text-gray-600 text-sm">Aadhaar eKYC and Digilocker integration</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Ready to revolutionize agricultural carbon management?
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-12 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              🌱 Start Your Journey
            </Link>
            <Link
              href="/blockchain"
              className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 px-12 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200"
            >
              🔍 Explore Technology
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
