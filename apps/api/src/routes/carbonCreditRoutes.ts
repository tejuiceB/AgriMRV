import express from 'express';
import { authenticate } from '../middleware/auth';
import CarbonCreditService from '../services/carbonCreditService';
import { BiomassEstimationService } from '../services/biomassEstimation';
import pool from '../config/database';

const router = express.Router();

/**
 * Carbon Credit Calculation & Pricing API Routes
 */

// Calculate carbon credits from biomass (manual input)
router.post('/credits/calculate', authenticate, async (req, res) => {
  try {
    const { biomass_kg } = req.body;
    
    if (!biomass_kg || biomass_kg <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid biomass value (kg) is required' 
      });
    }

    const result = await CarbonCreditService.calculateCarbonCreditsWithPricing(biomass_kg);
    
    res.json({
      success: true,
      data: result,
      message: 'Carbon credits calculated successfully'
    });
  } catch (error: any) {
    console.error('Error calculating carbon credits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate carbon credits' 
    });
  }
});

// Calculate and store carbon credits for a specific plot
router.post('/credits/plot/:plotId', authenticate, async (req, res) => {
  try {
    const { plotId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User authentication required' });
    }

    // Get plot biomass estimation first
    const biomassService = new BiomassEstimationService();
    const plotEstimation = await biomassService.estimatePlotBiomass(plotId);
    
    if (!plotEstimation.totals.total_biomass_kg || plotEstimation.totals.total_biomass_kg <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No biomass data available for this plot. Please run biomass estimation first.' 
      });
    }

    // Calculate carbon credits
    const result = await CarbonCreditService.calculateCarbonCreditsWithPricing(
      plotEstimation.totals.total_biomass_kg
    );

    // Store the calculation
    const stored = await CarbonCreditService.storeCarbonCreditCalculation(
      userId, 
      plotId, 
      result
    );

    res.json({
      success: true,
      data: {
        calculation: result,
        plot_summary: plotEstimation.totals,
        database_record: stored
      },
      message: 'Carbon credits calculated and stored successfully'
    });
  } catch (error: any) {
    console.error('Error calculating plot carbon credits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate plot carbon credits' 
    });
  }
});

// Get user's carbon credit summary
router.get('/credits/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User authentication required' });
    }

    const summary = await CarbonCreditService.getUserCreditSummary(userId);
    
    res.json({
      success: true,
      data: summary,
      message: 'User credit summary retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching user credit summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credit summary' 
    });
  }
});

// Get user's carbon credit history
router.get('/credits/history', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User authentication required' });
    }

    const history = await CarbonCreditService.getCarbonCreditHistory(userId, limit);
    
    res.json({
      success: true,
      data: history,
      message: 'Credit history retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credit history' 
    });
  }
});

// Get latest market prices
router.get('/credits/market-price', async (req, res) => {
  try {
    const marketPrice = await CarbonCreditService.getLatestMarketPrice();
    
    if (!marketPrice) {
      return res.json({
        success: true,
        data: {
          price_usd: 8.50,
          price_inr: 700,
          market_name: 'Default Market Average',
          source: 'System Default',
          date: new Date().toISOString()
        },
        message: 'Using default market prices'
      });
    }
    
    res.json({
      success: true,
      data: marketPrice,
      message: 'Market price retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching market price:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch market price' 
    });
  }
});

// Update market prices (admin only - add proper authorization later)
router.post('/credits/market-price', authenticate, async (req, res) => {
  try {
    const { price_usd, price_inr, market_name, source } = req.body;
    
    if (!price_usd || !price_inr || price_usd <= 0 || price_inr <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid USD and INR prices are required' 
      });
    }

    await CarbonCreditService.updateMarketPrices(
      price_usd, 
      price_inr, 
      market_name || 'Manual Update',
      source || 'API Update'
    );
    
    res.json({
      success: true,
      message: 'Market prices updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating market prices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update market prices' 
    });
  }
});

// Get carbon credit calculation by ID
router.get('/credits/:calculationId', authenticate, async (req, res) => {
  try {
    const { calculationId } = req.params;
    const userId = req.user?.id;
    
    const result = await pool.query(`
      SELECT ccc.*, p.name as plot_name
      FROM carbon_credit_calculations ccc
      LEFT JOIN plots p ON ccc.plot_id = p.id
      WHERE ccc.id = $1 AND ccc.user_id = $2
    `, [calculationId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Carbon credit calculation not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Carbon credit calculation retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching carbon credit calculation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch carbon credit calculation' 
    });
  }
});

export default router;
