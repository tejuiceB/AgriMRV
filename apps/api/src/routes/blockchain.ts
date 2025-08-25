import express from 'express';
import blockchainService from '../services/blockchainService';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';

const router = express.Router();

/**
 * @route POST /api/blockchain/record
 * @desc Record carbon data on blockchain
 * @access Private
 */
router.post('/record', authenticate, async (req, res) => {
  try {
    const { plotId, treeId, carbonValue, biomassValue, methodology } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!plotId || !carbonValue || !biomassValue || !methodology) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: plotId, carbonValue, biomassValue, methodology'
      });
    }

    // Get user's farm ID
    const userResult = await pool.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const farmId = userResult.rows[0].farm_id;

    // Prepare carbon data
    const carbonData = {
      farmId: farmId.toString(),
      plotId: plotId.toString(),
      treeId: treeId?.toString(),
      carbonValue: parseFloat(carbonValue),
      biomassValue: parseFloat(biomassValue),
      methodology,
      confidence: 0.95, // Default confidence
      timestamp: new Date()
    };

    // Record on blockchain
    const blockchainRecord = await blockchainService.recordCarbonData(carbonData);

    if (!blockchainRecord) {
      return res.status(500).json({
        success: false,
        message: 'Failed to record on blockchain'
      });
    }

    res.json({
      success: true,
      message: 'Carbon data recorded on blockchain',
      data: {
        transactionHash: blockchainRecord.transactionHash,
        status: blockchainRecord.status,
        dataHash: blockchainRecord.dataHash,
        carbonValue: blockchainRecord.carbonValue
      }
    });

  } catch (error) {
    console.error('Blockchain record error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record on blockchain'
    });
  }
});

/**
 * @route POST /api/blockchain/verify/:recordId
 * @desc Verify carbon record on blockchain
 * @access Private (Verifiers only)
 */
router.post('/verify/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = req.user?.id;

    // Check if user is a verifier (in production, implement proper role checking)
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For demo, allow any authenticated user to verify
    // In production: check if user has verifier role
    // const userRole = userResult.rows[0].role;
    // if (userRole !== 'verifier') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Only verifiers can verify carbon records'
    //   });
    // }

    const verified = await blockchainService.verifyCarbonRecord(parseInt(recordId));

    if (verified) {
      res.json({
        success: true,
        message: 'Carbon record verified successfully',
        data: { recordId, verified: true }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to verify carbon record'
      });
    }

  } catch (error) {
    console.error('Blockchain verify error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify record'
    });
  }
});

/**
 * @route POST /api/blockchain/mint-credits/:recordId
 * @desc Mint carbon credits based on verified record
 * @access Private
 */
router.post('/mint-credits/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { creditsGenerated, priceUSD } = req.body;

    if (!creditsGenerated || !priceUSD) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: creditsGenerated, priceUSD'
      });
    }

    const transactionHash = await blockchainService.mintCarbonCredits(
      parseInt(recordId),
      parseFloat(creditsGenerated),
      parseFloat(priceUSD)
    );

    if (transactionHash) {
      res.json({
        success: true,
        message: 'Carbon credits minted successfully',
        data: {
          recordId,
          creditsGenerated: parseFloat(creditsGenerated),
          priceUSD: parseFloat(priceUSD),
          transactionHash
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to mint carbon credits'
      });
    }

  } catch (error) {
    console.error('Blockchain mint error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to mint credits'
    });
  }
});

/**
 * @route GET /api/blockchain/record/:recordId
 * @desc Get carbon record from blockchain
 * @access Private
 */
router.get('/record/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    
    const record = await blockchainService.getCarbonRecord(parseInt(recordId));
    
    res.json({
      success: true,
      data: record
    });

  } catch (error) {
    console.error('Get blockchain record error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get record'
    });
  }
});

/**
 * @route GET /api/blockchain/records
 * @desc Get all blockchain records for current user
 * @access Private
 */
router.get('/records', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const records = await blockchainService.getBlockchainRecords(parseInt(userId), limit);
    
    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('Get blockchain records error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get records'
    });
  }
});

/**
 * @route POST /api/blockchain/verify-integrity/:recordId
 * @desc Verify data integrity against blockchain
 * @access Private
 */
router.post('/verify-integrity/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const carbonData = req.body;

    // Validate carbon data format
    if (!carbonData.farmId || !carbonData.plotId || !carbonData.carbonValue) {
      return res.status(400).json({
        success: false,
        message: 'Invalid carbon data format'
      });
    }

    const isValid = await blockchainService.verifyDataIntegrity(
      parseInt(recordId),
      carbonData
    );

    res.json({
      success: true,
      data: {
        recordId,
        isValid,
        message: isValid ? 'Data integrity verified' : 'Data integrity check failed'
      }
    });

  } catch (error) {
    console.error('Verify integrity error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify integrity'
    });
  }
});

/**
 * @route GET /api/blockchain/status
 * @desc Get blockchain network status
 * @access Private
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await blockchainService.getNetworkStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get blockchain status error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get status'
    });
  }
});

/**
 * @route GET /api/blockchain/farmer-records/:address
 * @desc Get all records for a farmer address
 * @access Private
 */
router.get('/farmer-records/:address', authenticate, async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum address format'
      });
    }

    const recordIds = await blockchainService.getFarmerRecords(address);
    
    // Get detailed records
    const detailedRecords = await Promise.all(
      recordIds.map(async (id) => {
        try {
          return await blockchainService.getCarbonRecord(id);
        } catch (error) {
          console.error(`Failed to get record ${id}:`, error);
          return null;
        }
      })
    );

    const validRecords = detailedRecords.filter(record => record !== null);

    res.json({
      success: true,
      data: {
        farmerAddress: address,
        totalRecords: recordIds.length,
        records: validRecords
      }
    });

  } catch (error) {
    console.error('Get farmer records error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get farmer records'
    });
  }
});

/**
 * @route POST /api/blockchain/deploy-contract
 * @desc Deploy carbon ledger contract (for testing)
 * @access Private (Admin only)
 */
router.post('/deploy-contract', authenticate, async (req, res) => {
  try {
    // In production, add admin role check
    const contractAddress = await blockchainService.deployContract();
    
    res.json({
      success: true,
      message: 'Contract deployment initiated',
      data: {
        contractAddress,
        note: 'This is a mock deployment for demo purposes'
      }
    });

  } catch (error) {
    console.error('Deploy contract error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to deploy contract'
    });
  }
});

export default router;
