import { ethers } from 'ethers';
import crypto from 'crypto';
import pool from '../config/database';

// Contract ABI (simplified for demo - in production, import from artifacts)
const CARBON_LEDGER_ABI = [
  "function recordCarbonData(string farmId, string plotId, string treeId, uint256 carbonValue, uint256 biomassValue, string dataHash, string methodology, string ipfsHash) external returns (uint256)",
  "function verifyCarbonRecord(uint256 recordId) external",
  "function mintCarbonCredits(uint256 recordId, uint256 creditsGenerated, uint256 priceUSD) external returns (uint256)",
  "function getCarbonRecord(uint256 recordId) external view returns (tuple(uint256 recordId, address farmer, string farmId, string plotId, string treeId, uint256 carbonValue, uint256 biomassValue, string dataHash, string methodology, uint256 timestamp, bool isVerified, address verifier, string ipfsHash))",
  "function getFarmerRecords(address farmer) external view returns (uint256[])",
  "function verifyDataIntegrity(uint256 recordId, string dataToVerify) external view returns (bool)",
  "function getTotalRecords() external view returns (uint256)",
  "event CarbonRecorded(uint256 indexed recordId, address indexed farmer, string farmId, string plotId, uint256 carbonValue, string dataHash, uint256 timestamp)",
  "event CarbonVerified(uint256 indexed recordId, address indexed verifier, uint256 timestamp)",
  "event CreditMinted(uint256 indexed creditId, uint256 indexed recordId, address indexed farmer, uint256 creditsGenerated, uint256 timestamp)"
];

// Configuration with multiple RPC endpoints for reliability
const BLOCKCHAIN_CONFIG = {
  // Multiple Polygon Mumbai Testnet RPC endpoints for fallback
  rpcUrls: [
    process.env.POLYGON_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/polygon_mumbai',
    'https://polygon-mumbai-bor.publicnode.com',
    'https://endpoints.omniatech.io/v1/matic/mumbai/public',
    'https://polygon-mumbai.chainstacklabs.com'
  ],
  chainId: 80001, // Mumbai testnet
  contractAddress: process.env.CARBON_LEDGER_CONTRACT || '0x742d35cc6644c0532925a3b8d1f9524fc35e0aa1', // Demo contract
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '0x1234567890123456789012345678901234567890123456789012345678901234', // Demo key
  gasLimit: 500000,
  maxFeePerGas: ethers.parseUnits('30', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei'),
  simulationMode: process.env.BLOCKCHAIN_SIMULATION === 'true' || true // Enable simulation by default
};

interface CarbonData {
  farmId: string;
  plotId: string;
  treeId?: string;
  carbonValue: number; // in kg
  biomassValue: number; // in kg
  methodology: string;
  confidence: number;
  timestamp: Date;
  additionalData?: any;
}

interface BlockchainRecord {
  recordId: number;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'pending' | 'confirmed' | 'failed';
  farmer: string;
  dataHash: string;
  carbonValue: number;
  timestamp: Date;
}

class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private contract!: ethers.Contract;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      // Check if simulation mode is enabled
      if (BLOCKCHAIN_CONFIG.simulationMode) {
        console.log('🎭 Blockchain simulation mode enabled - using mock data');
        this.isInitialized = true;
        return;
      }

      // Try multiple RPC providers for reliability
      let providerInitialized = false;
      
      for (const rpcUrl of BLOCKCHAIN_CONFIG.rpcUrls) {
        try {
          console.log(`Trying RPC endpoint: ${rpcUrl}`);
          this.provider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Test the connection
          await this.provider.getBlockNumber();
          console.log(`✅ Successfully connected to: ${rpcUrl}`);
          providerInitialized = true;
          break;
        } catch (error) {
          console.warn(`❌ Failed to connect to ${rpcUrl}:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
      }

      if (!providerInitialized) {
        console.warn('⚠️ All RPC endpoints failed, falling back to simulation mode');
        BLOCKCHAIN_CONFIG.simulationMode = true;
        this.isInitialized = true;
        return;
      }
      
      // Initialize wallet
      if (!BLOCKCHAIN_CONFIG.privateKey || BLOCKCHAIN_CONFIG.privateKey === '0x1234567890123456789012345678901234567890123456789012345678901234') {
        console.warn('⚠️ Using demo private key - blockchain features will be in simulation mode');
        BLOCKCHAIN_CONFIG.simulationMode = true;
        this.isInitialized = true;
        return;
      }
      
      this.wallet = new ethers.Wallet(BLOCKCHAIN_CONFIG.privateKey, this.provider);
      
      // Initialize contract
      if (BLOCKCHAIN_CONFIG.contractAddress && BLOCKCHAIN_CONFIG.contractAddress !== '0x0000000000000000000000000000000000000000') {
        this.contract = new ethers.Contract(
          BLOCKCHAIN_CONFIG.contractAddress,
          CARBON_LEDGER_ABI,
          this.wallet
        );
        this.isInitialized = true;
        console.log('✅ Blockchain service initialized successfully');
      } else {
        console.warn('⚠️ Carbon Ledger contract not deployed. Using simulation mode.');
        BLOCKCHAIN_CONFIG.simulationMode = true;
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service, falling back to simulation mode:', error);
      BLOCKCHAIN_CONFIG.simulationMode = true;
      this.isInitialized = true;
    }
  }

  /**
   * Generate hash of carbon data for blockchain storage
   */
  private generateDataHash(data: CarbonData): string {
    const dataString = JSON.stringify({
      farmId: data.farmId,
      plotId: data.plotId,
      treeId: data.treeId || '',
      carbonValue: data.carbonValue,
      biomassValue: data.biomassValue,
      methodology: data.methodology,
      timestamp: data.timestamp.toISOString()
    });
    
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Record carbon data on blockchain
   */
  async recordCarbonData(data: CarbonData, userAddress?: string): Promise<BlockchainRecord | null> {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized. Check configuration.');
    }

    try {
      // Generate data hash
      const dataHash = this.generateDataHash(data);
      
      // Simulation mode - create mock transaction
      if (BLOCKCHAIN_CONFIG.simulationMode) {
        const mockTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
        const mockAddress = userAddress || '0x742d35Cc6644C0532925a3b8D1f9524fC35e0aa1';
        
        console.log(`🎭 SIMULATION: Recording carbon data with mock transaction: ${mockTxHash}`);
        
        // Store mock transaction in database
        const dbRecord = await this.storePendingTransaction(
          mockTxHash,
          mockAddress,
          data,
          dataHash
        );

        // Simulate confirmation after a delay
        setTimeout(() => this.simulateConfirmation(mockTxHash, dbRecord.id), 2000);

        return {
          recordId: 0, // Will be updated after confirmation
          transactionHash: mockTxHash,
          blockNumber: 0,
          gasUsed: '21000', // Mock gas usage
          status: 'pending',
          farmer: mockAddress,
          dataHash,
          carbonValue: data.carbonValue,
          timestamp: new Date()
        };
      }

      // Convert values to grams (to avoid decimals in smart contract)
      const carbonValueGrams = Math.round(data.carbonValue * 1000);
      const biomassValueGrams = Math.round(data.biomassValue * 1000);
      
      // Call smart contract
      const tx = await this.contract.recordCarbonData(
        data.farmId,
        data.plotId,
        data.treeId || '',
        carbonValueGrams,
        biomassValueGrams,
        dataHash,
        data.methodology,
        '' // IPFS hash (optional, empty for now)
      );

      // Store pending transaction in database
      const dbRecord = await this.storePendingTransaction(
        tx.hash,
        userAddress || this.wallet.address,
        data,
        dataHash
      );

      console.log(`Carbon data recorded on blockchain. Transaction: ${tx.hash}`);

      // Wait for transaction confirmation (don't await in production - use background job)
      this.confirmTransaction(tx.hash, dbRecord.id);

      return {
        recordId: 0, // Will be updated after confirmation
        transactionHash: tx.hash,
        blockNumber: 0, // Will be updated after confirmation
        gasUsed: '0', // Will be updated after confirmation
        status: 'pending',
        farmer: userAddress || this.wallet.address,
        dataHash,
        carbonValue: data.carbonValue,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Failed to record carbon data on blockchain:', error);
      throw new Error(`Blockchain recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify carbon record on blockchain
   */
  async verifyCarbonRecord(recordId: number): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      // Simulation mode
      if (BLOCKCHAIN_CONFIG.simulationMode) {
        console.log(`🎭 SIMULATION: Verifying carbon record ${recordId}`);
        
        // Update database record with mock verification
        await pool.query(
          'UPDATE carbon_credit_blockchain SET is_verified = true, verifier_address = $1, verification_date = NOW() WHERE blockchain_record_id = $2',
          ['0x742d35Cc6644C0532925a3b8D1f9524fC35e0aa1', recordId]
        );
        
        console.log(`🎭 SIMULATION: Carbon record ${recordId} verified`);
        return true;
      }

      const tx = await this.contract.verifyCarbonRecord(recordId);
      await tx.wait();
      
      console.log(`Carbon record ${recordId} verified on blockchain`);
      
      // Update database record
      await pool.query(
        'UPDATE carbon_credit_blockchain SET is_verified = true, verifier_address = $1, verification_date = NOW() WHERE blockchain_record_id = $2',
        [this.wallet.address, recordId]
      );
      
      return true;
    } catch (error) {
      console.error('Failed to verify carbon record:', error);
      return false;
    }
  }

  /**
   * Mint carbon credits based on blockchain record
   */
  async mintCarbonCredits(recordId: number, creditsGenerated: number, priceUSD: number): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      // Convert credits to wei (18 decimals) and price to cents
      const creditsWei = ethers.parseUnits(creditsGenerated.toString(), 18);
      const priceCents = Math.round(priceUSD * 100);
      
      const tx = await this.contract.mintCarbonCredits(recordId, creditsWei, priceCents);
      const receipt = await tx.wait();
      
      console.log(`Carbon credits minted. Transaction: ${tx.hash}`);
      
      // Update database with credit information
      await pool.query(
        'UPDATE carbon_credit_blockchain SET credits_minted = $1, mint_transaction_hash = $2, mint_date = NOW() WHERE blockchain_record_id = $3',
        [creditsGenerated, tx.hash, recordId]
      );
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to mint carbon credits:', error);
      throw error;
    }
  }

  /**
   * Get carbon record from blockchain
   */
  async getCarbonRecord(recordId: number): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const record = await this.contract.getCarbonRecord(recordId);
      
      return {
        recordId: Number(record.recordId),
        farmer: record.farmer,
        farmId: record.farmId,
        plotId: record.plotId,
        treeId: record.treeId,
        carbonValue: Number(record.carbonValue) / 1000, // Convert back to kg
        biomassValue: Number(record.biomassValue) / 1000, // Convert back to kg
        dataHash: record.dataHash,
        methodology: record.methodology,
        timestamp: new Date(Number(record.timestamp) * 1000),
        isVerified: record.isVerified,
        verifier: record.verifier,
        ipfsHash: record.ipfsHash
      };
    } catch (error) {
      console.error('Failed to get carbon record from blockchain:', error);
      throw error;
    }
  }

  /**
   * Get all blockchain records for a farmer
   */
  async getFarmerRecords(farmerAddress: string): Promise<number[]> {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const recordIds = await this.contract.getFarmerRecords(farmerAddress);
      return recordIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Failed to get farmer records:', error);
      throw error;
    }
  }

  /**
   * Verify data integrity against blockchain
   */
  async verifyDataIntegrity(recordId: number, data: CarbonData): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const dataHash = this.generateDataHash(data);
      const isValid = await this.contract.verifyDataIntegrity(recordId, dataHash);
      return isValid;
    } catch (error) {
      console.error('Failed to verify data integrity:', error);
      return false;
    }
  }

  /**
   * Get blockchain network status
   */
  async getNetworkStatus(): Promise<any> {
    try {
      // Simulation mode status
      if (BLOCKCHAIN_CONFIG.simulationMode) {
        return {
          connected: true,
          network: 'Polygon Mumbai (Simulated)',
          chainId: 80001,
          blockNumber: Math.floor(Math.random() * 1000000) + 45000000,
          walletAddress: '0x742d35Cc6644C0532925a3b8D1f9524fC35e0aa1',
          walletBalance: '1.5 MATIC',
          contractAddress: BLOCKCHAIN_CONFIG.contractAddress,
          contractDeployed: true,
          simulationMode: true
        };
      }

      if (!this.provider) {
        return { connected: false, error: 'Provider not initialized' };
      }

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      let walletBalance = '0';
      if (this.wallet) {
        const balance = await this.provider.getBalance(this.wallet.address);
        walletBalance = ethers.formatEther(balance);
      }

      return {
        connected: true,
        network: network.name,
        chainId: Number(network.chainId),
        blockNumber,
        walletAddress: this.wallet?.address || 'Not connected',
        walletBalance: `${walletBalance} MATIC`,
        contractAddress: BLOCKCHAIN_CONFIG.contractAddress,
        contractDeployed: this.isInitialized,
        simulationMode: false
      };
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Store pending blockchain transaction in database
   */
  private async storePendingTransaction(
    transactionHash: string,
    farmerAddress: string,
    data: CarbonData,
    dataHash: string
  ): Promise<any> {
    const query = `
      INSERT INTO carbon_credit_blockchain 
      (transaction_hash, farmer_address, plot_id, tree_id, carbon_value_kg, biomass_value_kg, 
       data_hash, methodology, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
      RETURNING *
    `;
    
    const values = [
      transactionHash,
      farmerAddress,
      data.plotId,
      data.treeId || null,
      data.carbonValue,
      data.biomassValue,
      dataHash,
      data.methodology
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Simulate blockchain confirmation for demo purposes
   */
  private async simulateConfirmation(transactionHash: string, dbRecordId: number) {
    try {
      console.log(`🎭 SIMULATION: Confirming transaction ${transactionHash}`);
      
      // Generate mock blockchain record ID
      const mockRecordId = Math.floor(Math.random() * 10000) + 1000;
      const mockBlockNumber = Math.floor(Math.random() * 1000000) + 45000000;
      
      // Update database with mock confirmation
      await pool.query(
        `UPDATE carbon_credit_blockchain 
         SET status = 'confirmed', blockchain_record_id = $1, block_number = $2, 
             gas_used = $3, confirmation_date = NOW()
         WHERE id = $4`,
        [mockRecordId, mockBlockNumber, '21000', dbRecordId]
      );
      
      console.log(`🎭 SIMULATION: Transaction ${transactionHash} confirmed. Record ID: ${mockRecordId}`);
    } catch (error) {
      console.error(`Error simulating confirmation for ${transactionHash}:`, error);
      
      // Mark as failed
      await pool.query(
        'UPDATE carbon_credit_blockchain SET status = $1 WHERE id = $2',
        ['failed', dbRecordId]
      );
    }
  }

  /**
   * Confirm blockchain transaction (background process)
   */
  private async confirmTransaction(transactionHash: string, dbRecordId: number) {
    try {
      // Wait for transaction confirmation
      const receipt = await this.provider.waitForTransaction(transactionHash, 1);
      
      if (receipt && receipt.status === 1) {
        // Parse events to get record ID
        let recordId = 0;
        if (receipt.logs && receipt.logs.length > 0) {
          try {
            const event = this.contract.interface.parseLog(receipt.logs[0]);
            recordId = event ? Number(event.args.recordId) : 0;
          } catch (e) {
            console.warn('Could not parse event logs:', e);
          }
        }
        
        // Update database with confirmation
        await pool.query(
          `UPDATE carbon_credit_blockchain 
           SET status = 'confirmed', blockchain_record_id = $1, block_number = $2, 
               gas_used = $3, confirmation_date = NOW()
           WHERE id = $4`,
          [recordId, receipt.blockNumber, receipt.gasUsed.toString(), dbRecordId]
        );
        
        console.log(`Transaction ${transactionHash} confirmed. Record ID: ${recordId}`);
      } else {
        // Mark as failed
        await pool.query(
          'UPDATE carbon_credit_blockchain SET status = $1 WHERE id = $2',
          ['failed', dbRecordId]
        );
        
        console.error(`Transaction ${transactionHash} failed`);
      }
    } catch (error) {
      console.error(`Error confirming transaction ${transactionHash}:`, error);
      
      // Mark as failed
      await pool.query(
        'UPDATE carbon_credit_blockchain SET status = $1 WHERE id = $2',
        ['failed', dbRecordId]
      );
    }
  }

  /**
   * Get blockchain records from database
   */
  async getBlockchainRecords(userId: number, limit: number = 10): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT ccb.*, p.name as plot_name
        FROM carbon_credit_blockchain ccb
        LEFT JOIN plots p ON ccb.plot_id = p.id::text
        WHERE ccb.farmer_address = (
          SELECT ethereum_address FROM users WHERE id = $1
        ) OR $1 IS NULL
        ORDER BY ccb.created_at DESC
        LIMIT $2
      `, [userId, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Failed to get blockchain records from database:', error);
      return [];
    }
  }

  /**
   * Deploy contract (for testing/demo purposes)
   */
  async deployContract(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    // This would contain the bytecode and constructor parameters
    // For demo purposes, we'll return a mock address
    console.log('Contract deployment would happen here');
    return '0x742d35cc6644c0532925a3b8d1f9524fc35e0aa1'; // Mock address
  }
}

export default new BlockchainService();
