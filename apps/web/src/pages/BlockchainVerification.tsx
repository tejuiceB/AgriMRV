import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

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
  error?: string;
}

const BlockchainVerification: React.FC = () => {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingRecord, setVerifyingRecord] = useState<number | null>(null);
  const [recordingData, setRecordingData] = useState(false);
  const [activeTab, setActiveTab] = useState('records');

  useEffect(() => {
    fetchBlockchainData();
  }, []);

  const fetchBlockchainData = async () => {
    if (!token) return;
    
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
        await fetchBlockchainData(); // Refresh data
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
        await fetchBlockchainData(); // Refresh data
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blockchain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blockchain Verification</h1>
          <p className="text-gray-600 mt-2">Immutable carbon record verification and management</p>
        </div>
        <button 
          onClick={recordCarbonData}
          disabled={recordingData || !networkStatus?.connected}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium"
        >
          {recordingData ? 'Recording...' : 'Record Carbon Data'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('records')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'records' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Blockchain Records
            </button>
            <button 
              onClick={() => setActiveTab('network')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'network' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Network Status
            </button>
            <button 
              onClick={() => setActiveTab('verification')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'verification' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verification Portal
            </button>
          </nav>
        </div>

        {activeTab === 'records' && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                  🔗 Carbon Records on Blockchain
                </h3>
                <div className="mt-5">
                  {records.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🔗</div>
                      <p className="text-gray-600">No blockchain records found</p>
                      <p className="text-gray-500 text-sm">Record your first carbon data to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {records.map((record) => (
                        <div key={record.id} className="border border-gray-200 rounded-lg p-4 border-l-4 border-l-green-500">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">📝 Transaction</span>
                              </div>
                              <p className="text-sm text-blue-600 font-mono">
                                {truncateHash(record.transaction_hash)}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(record.status)}
                                {getVerificationBadge(record.is_verified)}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">💰 Carbon Data</span>
                              </div>
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
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">⏰ Timeline</span>
                              </div>
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
                                  className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded"
                                >
                                  {verifyingRecord === record.blockchain_record_id ? 'Verifying...' : 'Verify Record'}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {record.credits_minted && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg">
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
              </div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                  🌐 Blockchain Network Status
                </h3>
                <div className="mt-5">
                  {networkStatus ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${networkStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium">Connection Status</span>
                          <span className={`px-2 py-1 rounded text-xs ${networkStatus.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {networkStatus.connected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                        
                        {networkStatus.connected && (
                          <>
                            <div>
                              <p className="text-sm text-gray-600">Network</p>
                              <p className="font-medium">{networkStatus.network} (Chain ID: {networkStatus.chainId})</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Current Block</p>
                              <p className="font-medium">{networkStatus.blockNumber?.toLocaleString()}</p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        {networkStatus.walletAddress && (
                          <>
                            <div>
                              <p className="text-sm text-gray-600">Wallet Address</p>
                              <p className="font-mono text-sm">{truncateHash(networkStatus.walletAddress)}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Wallet Balance</p>
                              <p className="font-medium">{networkStatus.walletBalance}</p>
                            </div>
                          </>
                        )}
                        
                        <div>
                          <p className="text-sm text-gray-600">Contract Status</p>
                          <span className={`px-2 py-1 rounded text-xs ${networkStatus.contractDeployed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {networkStatus.contractDeployed ? 'Deployed' : 'Not Deployed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🌐</div>
                      <p className="text-gray-600">Unable to connect to blockchain network</p>
                    </div>
                  )}
                  
                  {networkStatus?.error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">{networkStatus.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-4">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                  🛡️ Verifier Portal
                </h3>
                <div className="mt-5">
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🛡️</div>
                    <p className="text-gray-600 mb-2">Carbon Record Verification</p>
                    <p className="text-gray-500 text-sm mb-4">
                      Verify carbon records to enable credit minting and trading
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                      {records
                        .filter(record => record.status === 'confirmed' && !record.is_verified)
                        .map((record) => (
                          <div key={record.id} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <p className="text-sm font-medium mb-2">Record #{record.blockchain_record_id}</p>
                            <p className="text-xs text-gray-600 mb-3">
                              {record.carbon_value_kg.toLocaleString()} kg Carbon
                            </p>
                            <button
                              onClick={() => verifyRecord(record.blockchain_record_id)}
                              disabled={verifyingRecord === record.blockchain_record_id}
                              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded"
                            >
                              {verifyingRecord === record.blockchain_record_id ? 'Verifying...' : 'Verify'}
                            </button>
                          </div>
                        ))}
                      
                      {records.filter(record => record.status === 'confirmed' && !record.is_verified).length === 0 && (
                        <div className="col-span-3 text-center py-4">
                          <p className="text-gray-500">No records pending verification</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainVerification;
