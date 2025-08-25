import { Request, Response } from 'express';
import pool from '../config/database';

// Get all carbon estimates (optionally filtered by tree_id)
export const getCarbonEstimates = async (req: Request, res: Response): Promise<void> => {
  const treeId = req.query.tree_id as string | undefined;
  
  try {
    let query = 'SELECT * FROM carbon_estimates';
    let params: any[] = [];
    
    if (treeId) {
      query += ' WHERE tree_id = $1';
      params.push(treeId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching carbon estimates:', error);
    res.status(500).json({ error: 'Failed to fetch carbon estimates' });
  }
};

// Get a carbon estimate by ID
export const getCarbonEstimateById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Get estimate data
    const estimateResult = await pool.query('SELECT * FROM carbon_estimates WHERE id = $1', [id]);
    
    if (estimateResult.rows.length === 0) {
      res.status(404).json({ error: 'Carbon estimate not found' });
      return;
    }
    
    // Get ledger entries for this estimate
    const ledgerResult = await pool.query(
      'SELECT * FROM ledger WHERE estimate_id = $1 ORDER BY verified_at DESC',
      [id]
    );
    
    // Get tree data
    const treeId = estimateResult.rows[0].tree_id;
    const treeResult = await pool.query('SELECT * FROM trees WHERE id = $1', [treeId]);
    
    // Combine everything
    const estimate = {
      ...estimateResult.rows[0],
      tree: treeResult.rows[0],
      ledger_entries: ledgerResult.rows
    };
    
    res.json(estimate);
  } catch (error) {
    console.error(`Error fetching carbon estimate ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch carbon estimate' });
  }
};

// Create a new carbon estimate
export const createCarbonEstimate = async (req: Request, res: Response): Promise<void> => {
  const { 
    tree_id, 
    biomass_estimate_kg, 
    carbon_sequestration_kg, 
    method,
    confidence_pct
  } = req.body;
  
  // Validation
  if (!tree_id || !biomass_estimate_kg) {
    res.status(400).json({ error: 'Tree ID and biomass estimate are required' });
    return;
  }
  
  try {
    // Check if tree exists
    const treeResult = await pool.query('SELECT id FROM trees WHERE id = $1', [tree_id]);
    if (treeResult.rows.length === 0) {
      res.status(400).json({ error: 'Tree does not exist' });
      return;
    }
    
    // Create carbon estimate
    const result = await pool.query(
      `INSERT INTO carbon_estimates 
       (tree_id, biomass_estimate_kg, carbon_sequestration_kg, method, confidence_pct) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [tree_id, biomass_estimate_kg, carbon_sequestration_kg, method, confidence_pct]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating carbon estimate:', error);
    res.status(500).json({ error: 'Failed to create carbon estimate' });
  }
};

// Update a carbon estimate
export const updateCarbonEstimate = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { 
    biomass_estimate_kg, 
    carbon_sequestration_kg, 
    method,
    confidence_pct
  } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE carbon_estimates 
       SET biomass_estimate_kg = $1, carbon_sequestration_kg = $2, 
           method = $3, confidence_pct = $4
       WHERE id = $5 
       RETURNING *`,
      [biomass_estimate_kg, carbon_sequestration_kg, method, confidence_pct, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Carbon estimate not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating carbon estimate ${id}:`, error);
    res.status(500).json({ error: 'Failed to update carbon estimate' });
  }
};

// Delete a carbon estimate
export const deleteCarbonEstimate = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM carbon_estimates WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Carbon estimate not found' });
      return;
    }
    
    res.json({ message: 'Carbon estimate deleted successfully' });
  } catch (error) {
    console.error(`Error deleting carbon estimate ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete carbon estimate' });
  }
};
