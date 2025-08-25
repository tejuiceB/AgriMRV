import { Request, Response } from 'express';
import pool from '../config/database';

// Get all trees (optionally filtered by plot_id)
export const getTrees = async (req: Request, res: Response): Promise<void> => {
  const plotId = req.query.plot_id as string | undefined;
  
  try {
    let query = 'SELECT * FROM trees';
    let params: any[] = [];
    
    if (plotId) {
      query += ' WHERE plot_id = $1';
      params.push(plotId);
    }
    
    query += ' ORDER BY captured_at DESC';
    
    const result = await pool.query(query, params);
    
    // Process the numeric fields to ensure they're converted to proper numbers
    const processedTrees = result.rows.map((tree: any) => ({
      ...tree,
      height_meters: tree.height_meters !== null ? parseFloat(tree.height_meters) : null,
      dbh_cm: tree.dbh_cm !== null ? parseFloat(tree.dbh_cm) : null,
      canopy_cover_m2: tree.canopy_cover_m2 !== null ? parseFloat(tree.canopy_cover_m2) : null
    }));
    
    console.log('Processed trees:', JSON.stringify(processedTrees, null, 2));
    
    res.json(processedTrees);
  } catch (error) {
    console.error('Error fetching trees:', error);
    res.status(500).json({ error: 'Failed to fetch trees' });
  }
};

// Get a tree by ID
export const getTreeById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Get tree data
    const treeResult = await pool.query('SELECT * FROM trees WHERE id = $1', [id]);
    
    if (treeResult.rows.length === 0) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }
    
    // Get carbon estimates for this tree
    const estimatesResult = await pool.query(
      'SELECT * FROM carbon_estimates WHERE tree_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    // Process the tree data to ensure numeric fields are proper numbers
    const treeData = treeResult.rows[0];
    const processedTree = {
      ...treeData,
      height_meters: treeData.height_meters !== null ? parseFloat(treeData.height_meters) : null,
      dbh_cm: treeData.dbh_cm !== null ? parseFloat(treeData.dbh_cm) : null,
      canopy_cover_m2: treeData.canopy_cover_m2 !== null ? parseFloat(treeData.canopy_cover_m2) : null,
      carbon_estimates: estimatesResult.rows
    };
    
    res.json(processedTree);
  } catch (error) {
    console.error(`Error fetching tree ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch tree' });
  }
};

// Create a new tree measurement
export const createTree = async (req: Request, res: Response): Promise<void> => {
  const { 
    plot_id, 
    height_meters, 
    canopy_cover_m2, 
    dbh_cm,
    species_code,
    health_status
  } = req.body;
  
  // Validation
  if (!plot_id) {
    res.status(400).json({ error: 'Plot ID is required' });
    return;
  }
  
  try {
    // Check if plot exists
    const plotResult = await pool.query('SELECT id FROM plots WHERE id = $1', [plot_id]);
    if (plotResult.rows.length === 0) {
      res.status(400).json({ error: 'Plot does not exist' });
      return;
    }
    
    // Create tree measurement with proper handling of numeric fields
    const result = await pool.query(
      `INSERT INTO trees 
       (plot_id, height_meters, canopy_cover_m2, dbh_cm, species_code, health_status) 
       VALUES ($1, NULLIF($2, '')::decimal, NULLIF($3, '')::decimal, NULLIF($4, '')::decimal, $5, $6) 
       RETURNING *`,
      [plot_id, height_meters, canopy_cover_m2, dbh_cm, species_code, health_status]
    );
    
    // If we have enough data, calculate a basic carbon estimate (simplified model)
    if (height_meters && dbh_cm) {
      // Very basic allometric equation for demonstration
      const biomass_estimate_kg = 0.5 * Math.pow(dbh_cm / 100, 2) * height_meters * 500;
      const carbon_sequestration_kg = biomass_estimate_kg * 0.5; // Carbon is roughly 50% of biomass
      
      await pool.query(
        `INSERT INTO carbon_estimates 
         (tree_id, biomass_estimate_kg, carbon_sequestration_kg, method, confidence_pct) 
         VALUES ($1, $2, $3, $4, $5)`,
        [result.rows[0].id, biomass_estimate_kg, carbon_sequestration_kg, 'basic_allometric', 70]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating tree measurement:', error);
    res.status(500).json({ error: 'Failed to create tree measurement' });
  }
};

// Update a tree measurement
export const updateTree = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { 
    height_meters, 
    canopy_cover_m2, 
    dbh_cm,
    species_code,
    health_status
  } = req.body;
  
  // Debug info
  console.log('Updating tree with ID:', id);
  console.log('Request body:', req.body);
  console.log('Extracted fields:',  { height_meters, canopy_cover_m2, dbh_cm, species_code, health_status });
  
  try {
    // Make sure we handle numeric values correctly
    const result = await pool.query(
      `UPDATE trees 
       SET height_meters = NULLIF($1, '')::decimal, 
           canopy_cover_m2 = NULLIF($2, '')::decimal, 
           dbh_cm = NULLIF($3, '')::decimal, 
           species_code = $4, 
           health_status = $5,
           updated_at = NOW() -- Update the timestamp
       WHERE id = $6 
       RETURNING *`,
      [height_meters, canopy_cover_m2, dbh_cm, species_code, health_status, id]
    );
    
    console.log('Update result:', result.rows[0]);
    
    if (result.rows.length === 0) {
      console.log('No tree found with ID:', id);
      res.status(404).json({ error: 'Tree not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating tree ${id}:`, error);
    res.status(500).json({ error: 'Failed to update tree' });
  }
};

// Delete a tree measurement
export const deleteTree = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM trees WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }
    
    res.json({ message: 'Tree measurement deleted successfully' });
  } catch (error) {
    console.error(`Error deleting tree ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete tree' });
  }
};
