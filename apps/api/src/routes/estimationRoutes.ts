import { Router, Request, Response } from 'express';
import { BiomassEstimationService } from '../services/biomassEstimation';
import { authenticate } from '../middleware/auth';

const router = Router();
const estimationService = new BiomassEstimationService();

/**
 * POST /api/estimate - Run biomass estimation for a single tree
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { height_meters, dbh_cm, canopy_cover_m2, species_code } = req.body;

    // Validate input
    if (!height_meters && !dbh_cm && !canopy_cover_m2) {
      res.status(400).json({ 
        error: 'At least one measurement (height, DBH, or canopy cover) is required' 
      });
      return;
    }

    const estimate = await estimationService.estimateBiomass({
      height_meters: height_meters ? parseFloat(height_meters) : undefined,
      dbh_cm: dbh_cm ? parseFloat(dbh_cm) : undefined,
      canopy_cover_m2: canopy_cover_m2 ? parseFloat(canopy_cover_m2) : undefined,
      species_code
    });

    res.json({
      success: true,
      estimate,
      message: `Estimation completed using ${estimate.method} method`
    });

  } catch (error: any) {
    console.error('Error in biomass estimation:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to estimate biomass',
      success: false 
    });
  }
});

/**
 * POST /api/estimate/tree/:treeId - Run estimation for specific tree and store result
 */
router.post('/tree/:treeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { treeId } = req.params;

    // Get tree data from database
    const { Pool } = require('pg');
    const pool = require('../config/database').default;
    
    const treeResult = await pool.query('SELECT * FROM trees WHERE id = $1', [treeId]);
    
    if (treeResult.rows.length === 0) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }

    const tree = treeResult.rows[0];

    // Run estimation
    const estimate = await estimationService.estimateBiomass({
      height_meters: tree.height_meters,
      dbh_cm: tree.dbh_cm,
      canopy_cover_m2: tree.canopy_cover_m2,
      species_code: tree.species_code
    });

    // Store in database
    const storedEstimate = await estimationService.storeEstimate(treeId, estimate);

    res.json({
      success: true,
      tree_id: treeId,
      estimate,
      stored_estimate: storedEstimate,
      message: 'Estimation completed and stored successfully'
    });

  } catch (error: any) {
    console.error('Error in tree estimation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to estimate tree biomass',
      success: false 
    });
  }
});

/**
 * POST /api/estimate/plot/:plotId - Run estimation for entire plot
 */
router.post('/plot/:plotId', authenticate, async (req: Request, res: Response) => {
  try {
    const { plotId } = req.params;
    const { store_results = true } = req.body;

    // Check if plot exists and user has access
    const { Pool } = require('pg');
    const pool = require('../config/database').default;
    const userId = req.user?.id;

    const plotResult = await pool.query(
      'SELECT * FROM plots WHERE id = $1 AND user_id = $2',
      [plotId, userId]
    );

    if (plotResult.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found or access denied' });
      return;
    }

    // Run plot-level estimation
    const results = await estimationService.estimatePlotBiomass(plotId);

    // Store results if requested
    if (store_results) {
      for (const treeResult of results.trees) {
        await estimationService.storeEstimate(treeResult.tree_id, treeResult.estimate);
      }
    }

    res.json({
      success: true,
      plot_id: plotId,
      plot_name: plotResult.rows[0].name,
      results,
      stored_to_database: store_results,
      message: `Estimation completed for ${results.totals.total_trees} trees`
    });

  } catch (error: any) {
    console.error('Error in plot estimation:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to estimate plot biomass',
      success: false 
    });
  }
});

/**
 * GET /api/estimate/species - Get all available species
 */
router.get('/species', authenticate, async (req: Request, res: Response) => {
  try {
    const species = await estimationService.getAllSpecies();
    res.json({
      success: true,
      species,
      count: species.length
    });
  } catch (error: any) {
    console.error('Error fetching species:', error);
    res.status(500).json({ 
      error: 'Failed to fetch species data',
      success: false 
    });
  }
});

/**
 * GET /api/estimate/species/:code - Get specific species data
 */
router.get('/species/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const species = await estimationService.getSpeciesData(code);
    
    if (!species) {
      res.status(404).json({ error: 'Species not found' });
      return;
    }

    res.json({
      success: true,
      species
    });
  } catch (error: any) {
    console.error('Error fetching species:', error);
    res.status(500).json({ 
      error: 'Failed to fetch species data',
      success: false 
    });
  }
});

/**
 * GET /api/estimate/plot/:plotId/summary - Get plot estimation summary
 */
router.get('/plot/:plotId/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const { plotId } = req.params;
    const userId = req.user?.id;

    // Check plot access
    const { Pool } = require('pg');
    const pool = require('../config/database').default;
    
    const plotResult = await pool.query(
      'SELECT * FROM plots WHERE id = $1 AND user_id = $2',
      [plotId, userId]
    );

    if (plotResult.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found or access denied' });
      return;
    }

    // Get stored estimates
    const estimatesResult = await pool.query(`
      SELECT 
        t.id as tree_id,
        t.species_code,
        t.height_meters,
        t.dbh_cm,
        t.canopy_cover_m2,
        ce.biomass_estimate_kg,
        ce.carbon_sequestration_kg,
        ce.method,
        ce.confidence_pct,
        ce.created_at as estimate_date
      FROM trees t
      LEFT JOIN carbon_estimates ce ON t.id = ce.tree_id
      WHERE t.plot_id = $1
      ORDER BY t.id
    `, [plotId]);

    const trees = estimatesResult.rows;
    
    // Calculate totals
    const totalBiomass = trees.reduce((sum: number, tree: any) => sum + (tree.biomass_estimate_kg || 0), 0);
    const totalCarbon = trees.reduce((sum: number, tree: any) => sum + (tree.carbon_sequestration_kg || 0), 0);
    const totalCo2 = totalCarbon * 3.67;
    const estimatedTrees = trees.filter((tree: any) => tree.biomass_estimate_kg).length;

    res.json({
      success: true,
      plot: plotResult.rows[0],
      summary: {
        total_trees: trees.length,
        estimated_trees: estimatedTrees,
        pending_estimation: trees.length - estimatedTrees,
        total_biomass_kg: Math.round(totalBiomass * 100) / 100,
        total_carbon_kg: Math.round(totalCarbon * 100) / 100,
        total_co2_equivalent_kg: Math.round(totalCo2 * 100) / 100,
        total_biomass_tons: Math.round(totalBiomass / 10) / 100,
        total_carbon_tons: Math.round(totalCarbon / 10) / 100,
        total_co2_equivalent_tons: Math.round(totalCo2 / 10) / 100
      },
      trees
    });

  } catch (error: any) {
    console.error('Error getting plot summary:', error);
    res.status(500).json({ 
      error: 'Failed to get plot estimation summary',
      success: false 
    });
  }
});

export default router;
