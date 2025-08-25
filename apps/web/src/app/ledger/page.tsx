'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BlockchainRecord {
  id: number;
  transaction_hash: string;
  blockchain_record_id: number;
  farmer_address: string;
  plot_id: string;
  tree_id?: string;
  carbon_value_kg: number;
  biomass_value_kg: number;
  data_hash: string;
  methodology: string;
  status: 'pending' | 'confirmed' | 'failed';
  is_verified: boolean;
  verifier_address?: string;
  credits_minted?: number;
  block_number?: number;
  gas_used?: string;
  created_at: string;
  confirmation_date?: string;
  verification_date?: string;
  mint_date?: string;
  plot_name?: string;
}

interface NetworkStatus {
  connected: boolean;
  network?: string;
  chainId?: number;
  blockNumber?: number;
  walletAddress?: string;
  walletBalance?: string;
  contractAddress?: string;
  contractDeployed?: boolean;
  simulationMode?: boolean;
  error?: string;
}

export default function BlockchainLedgerPage() {
  const router = useRouter();
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingRecord, setVerifyingRecord] = useState<number | null>(null);
  const [recordingData, setRecordingData] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check authentication
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        setIsAuthenticated(true);
        fetchBlockchainData(token);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchBlockchainData = async (token: string) => {
    try {
      setLoading(true);
      
      // Fetch blockchain records
      const recordsResponse = await fetch('http://localhost:4000/api/blockchain/records', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setRecords(recordsData.data || []);
      }

      // Fetch network status
      const statusResponse = await fetch('http://localhost:4000/api/blockchain/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setNetworkStatus(statusData.data);
      }

    } catch (error) {
      console.error('Failed to fetch blockchain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyRecord = async (recordId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      setVerifyingRecord(recordId);
      
      const response = await fetch(`http://localhost:4000/api/blockchain/verify/${recordId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchBlockchainData(token); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Verification failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to verify record:', error);
      alert('Failed to verify record');
    } finally {
      setVerifyingRecord(null);
    }
  };

  const recordCarbonData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      setRecordingData(true);
      
      // For demo, use sample data from user's first plot
      const plotsResponse = await fetch('http://localhost:4000/api/plots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!plotsResponse.ok) {
        throw new Error('Failed to fetch plots');
      }
      
      const plotsData = await plotsResponse.json();
      if (!plotsData.data || plotsData.data.length === 0) {
        alert('No plots found. Please create a plot first.');
        return;
      }

      const firstPlot = plotsData.data[0];
      
      const response = await fetch('http://localhost:4000/api/blockchain/record', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plotId: firstPlot.id,
          carbonValue: 1500, // Sample data
          biomassValue: 2500,
          methodology: 'IPCC 2006 Guidelines'
        })
      });

      if (response.ok) {
        await fetchBlockchainData(token); // Refresh data
        alert('Carbon data recorded on blockchain successfully!');
      } else {
        const errorData = await response.json();
        alert(`Recording failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to record carbon data:', error);
      alert('Failed to record carbon data');
    } finally {
      setRecordingData(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'confirmed':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>✓ Confirmed</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>⏳ Pending</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>✗ Failed</span>;
      default:
        return <span className={`${baseClasses} border border-gray-300 text-gray-700`}>{status}</span>;
    }
  };

  const getVerificationBadge = (isVerified: boolean) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    return isVerified ? (
      <span className={`${baseClasses} bg-blue-100 text-blue-800`}>🛡️ Verified</span>
    ) : (
      <span className={`${baseClasses} border border-gray-300 text-gray-700`}>Unverified</span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⛓️</div>
          <h1 className="text-2xl font-bold text-gray-800">Loading Blockchain Ledger...</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-8xl mb-8">⛓️</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent mb-6">
              Blockchain Ledger
            </h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Immutable Verification & Transparency
            </h2>
            <p className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Experience immutable verification and transparency using Polygon blockchain for carbon record storage. 
              Every carbon measurement is cryptographically secured and permanently recorded.
            </p>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-gray-200 mb-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-8">🔐 Authentication Required</h3>
              <p className="text-gray-600 mb-8">
                Please log in to access the blockchain ledger and view your carbon record transactions.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  🚀 Login to Continue
                </Link>
                <Link
                  href="/register"
                  className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200"
                >
                  📝 Create Account
                </Link>
              </div>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-purple-100">
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl text-white">🛡️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Immutable Records</h3>
                <p className="text-gray-600 text-sm">
                  All carbon measurements permanently stored on Polygon blockchain
                </p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-indigo-100">
                <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl text-white">🔍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Full Transparency</h3>
                <p className="text-gray-600 text-sm">
                  Public verification of all carbon credits and transactions
                </p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-blue-100">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl text-white">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Low Cost</h3>
                <p className="text-gray-600 text-sm">
                  Efficient Polygon network reduces transaction costs significantly
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4">
            ⛓️ Blockchain Ledger
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Immutable Verification & Transparency
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Polygon blockchain for carbon record storage with cryptographic verification
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={recordCarbonData}
              disabled={recordingData || !networkStatus?.connected}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:transform-none"
            >
              {recordingData ? '⏳ Recording...' : '📝 Record Carbon Data'}
            </button>
          </div>
          
          {networkStatus && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${networkStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {networkStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
              {networkStatus.simulationMode && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  🎭 Simulation
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('records')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'records' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔗 Transaction Records
              </button>
              <button 
                onClick={() => setActiveTab('network')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'network' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🌐 Network Status
              </button>
              <button 
                onClick={() => setActiveTab('verification')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'verification' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🛡️ Verification
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading blockchain data...</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
                        <h3 className="text-2xl font-bold text-emerald-800 mb-2">
                          {records.filter(r => r.status === 'confirmed').length}
                        </h3>
                        <p className="text-emerald-600 font-medium">Confirmed Records</p>
                        <p className="text-emerald-500 text-sm">Permanently stored on blockchain</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                        <h3 className="text-2xl font-bold text-blue-800 mb-2">
                          {records.filter(r => r.is_verified).length}
                        </h3>
                        <p className="text-blue-600 font-medium">Verified Records</p>
                        <p className="text-blue-500 text-sm">Audited and validated</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                        <h3 className="text-2xl font-bold text-purple-800 mb-2">
                          {records.reduce((sum, r) => sum + (r.credits_minted || 0), 0).toLocaleString()}
                        </h3>
                        <p className="text-purple-600 font-medium">Credits Minted</p>
                        <p className="text-purple-500 text-sm">Ready for trading</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                      <h3 className="text-2xl font-bold text-gray-800 mb-6">🏛️ Blockchain Technology</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">🔐 Security Features</h4>
                          <ul className="space-y-2 text-gray-600">
                            <li>• Cryptographic hash verification</li>
                            <li>• Immutable transaction records</li>
                            <li>• Multi-signature verification</li>
                            <li>• Tamper-proof data storage</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">⚡ Performance Benefits</h4>
                          <ul className="space-y-2 text-gray-600">
                            <li>• Low transaction costs on Polygon</li>
                            <li>• Fast confirmation times</li>
                            <li>• Scalable infrastructure</li>
                            <li>• Energy-efficient consensus</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'records' && (
                  <div className="space-y-6">
                    {records.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔗</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Records Found</h3>
                        <p className="text-gray-600 mb-6">Start by recording your first carbon data on the blockchain</p>
                        <button
                          onClick={recordCarbonData}
                          disabled={recordingData}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                        >
                          {recordingData ? '⏳ Recording...' : '📝 Record Carbon Data'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {records.map((record) => (
                          <div key={record.id} className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-purple-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">📝 Transaction</span>
                                </div>
                                <p className="text-sm text-purple-600 font-mono break-all">
                                  {truncateHash(record.transaction_hash)}
                                </p>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(record.status)}
                                  {getVerificationBadge(record.is_verified)}
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">💰 Carbon Data</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm">
                                    <strong>Carbon:</strong> {record.carbon_value_kg.toLocaleString()} kg
                                  </p>
                                  <p className="text-sm">
                                    <strong>Biomass:</strong> {record.biomass_value_kg.toLocaleString()} kg
                                  </p>
                                  <p className="text-sm">
                                    <strong>Plot:</strong> {record.plot_name || record.plot_id}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">⏰ Timeline</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-600">
                                    <strong>Created:</strong> {formatDate(record.created_at)}
                                  </p>
                                  {record.confirmation_date && (
                                    <p className="text-xs text-gray-600">
                                      <strong>Confirmed:</strong> {formatDate(record.confirmation_date)}
                                    </p>
                                  )}
                                  {!record.is_verified && record.status === 'confirmed' && (
                                    <button
                                      onClick={() => verifyRecord(record.blockchain_record_id)}
                                      disabled={verifyingRecord === record.blockchain_record_id}
                                      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded-full"
                                    >
                                      {verifyingRecord === record.blockchain_record_id ? '⏳ Verifying...' : '🛡️ Verify'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {record.credits_minted && (
                              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800">
                                  💰 <strong>Credits Minted:</strong> {record.credits_minted} carbon credits
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'network' && (
                  <div className="space-y-6">
                    {networkStatus ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-lg">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">🌐 Network Information</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium ${networkStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                                {networkStatus.connected ? '✅ Connected' : '❌ Disconnected'}
                              </span>
                            </div>
                            {networkStatus.connected && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Network:</span>
                                  <span className="font-medium">{networkStatus.network}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Chain ID:</span>
                                  <span className="font-medium">{networkStatus.chainId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Block Number:</span>
                                  <span className="font-medium">{networkStatus.blockNumber?.toLocaleString()}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-6 shadow-lg">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">💼 Wallet & Contract</h3>
                          <div className="space-y-3">
                            {networkStatus.walletAddress && (
                              <>
                                <div>
                                  <span className="text-gray-600 block">Wallet Address:</span>
                                  <span className="font-mono text-sm">{truncateHash(networkStatus.walletAddress)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Balance:</span>
                                  <span className="font-medium">{networkStatus.walletBalance}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Contract:</span>
                              <span className={`font-medium ${networkStatus.contractDeployed ? 'text-green-600' : 'text-gray-500'}`}>
                                {networkStatus.contractDeployed ? '✅ Deployed' : '⏳ Not Deployed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">🌐</div>
                        <p className="text-gray-600">Unable to connect to blockchain network</p>
                      </div>
                    )}
                    
                    {networkStatus?.error && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Connection Error</h3>
                        <p className="text-red-700">{networkStatus.error}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'verification' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">🛡️ Record Verification Portal</h3>
                      <p className="text-gray-600 mb-8">
                        Verify carbon records to enable credit minting and trading
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {records
                        .filter(record => record.status === 'confirmed' && !record.is_verified)
                        .map((record) => (
                          <div key={record.id} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                            <div className="text-center">
                              <div className="text-4xl mb-3">📋</div>
                              <h4 className="font-bold text-lg mb-2">Record #{record.blockchain_record_id}</h4>
                              <div className="space-y-2 mb-4">
                                <p className="text-sm text-gray-600">
                                  <strong>Carbon:</strong> {record.carbon_value_kg.toLocaleString()} kg
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Plot:</strong> {record.plot_name || record.plot_id}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(record.created_at)}
                                </p>
                              </div>
                              <button
                                onClick={() => verifyRecord(record.blockchain_record_id)}
                                disabled={verifyingRecord === record.blockchain_record_id}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full font-medium"
                              >
                                {verifyingRecord === record.blockchain_record_id ? '⏳ Verifying...' : '🛡️ Verify Record'}
                              </button>
                            </div>
                          </div>
                        ))}
                      
                      {records.filter(record => record.status === 'confirmed' && !record.is_verified).length === 0 && (
                        <div className="col-span-full text-center py-16">
                          <div className="text-6xl mb-4">✅</div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">All Records Verified</h3>
                          <p className="text-gray-600">No records pending verification at this time</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
