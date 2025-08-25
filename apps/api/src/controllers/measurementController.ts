import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: '7889',
  host: 'localhost',
  port: 5432,
  database: 'agromrv'
});

// Get all measurements
export const getMeasurements = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.query.project_id;
  
  try {
    let query = 'SELECT * FROM measurements';
    let params: any[] = [];
    
    if (projectId) {
      query += ' WHERE project_id = $1';
      params.push(projectId);
    }
    
    query += ' ORDER BY captured_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
};

// Get measurement by ID
export const getMeasurementById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    // Get measurement data
    const measurementResult = await pool.query('SELECT * FROM measurements WHERE id = $1', [id]);
    
    if (measurementResult.rows.length === 0) {
      res.status(404).json({ error: 'Measurement not found' });
      return;
    }

    // Get blockchain records for this measurement
    const blockchainResult = await pool.query(
      'SELECT * FROM blockchain_records WHERE measurement_id = $1', 
      [id]
    );

    // Combine measurement with its blockchain records
    const measurement = {
      ...measurementResult.rows[0],
      blockchain_records: blockchainResult.rows
    };

    res.json(measurement);
  } catch (error) {
    console.error(`Error fetching measurement ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch measurement' });
  }
};

// Create a new measurement
export const createMeasurement = async (req: Request, res: Response): Promise<void> => {
  const { project_id, tree_height, canopy_cover, biomass_estimate, carbon_stock, captured_at } = req.body;
  
  // Validation
  if (!project_id) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  try {
    // Check if project exists
    const projectResult = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      res.status(400).json({ error: 'Project does not exist' });
      return;
    }

    // Insert measurement
    const result = await pool.query(
      `INSERT INTO measurements 
       (project_id, tree_height, canopy_cover, biomass_estimate, carbon_stock, captured_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [project_id, tree_height, canopy_cover, biomass_estimate, carbon_stock, captured_at || new Date()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating measurement:', error);
    res.status(500).json({ error: 'Failed to create measurement' });
  }
};

// Update a measurement
export const updateMeasurement = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { tree_height, canopy_cover, biomass_estimate, carbon_stock } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE measurements 
       SET tree_height = $1, canopy_cover = $2, biomass_estimate = $3, carbon_stock = $4
       WHERE id = $5 
       RETURNING *`,
      [tree_height, canopy_cover, biomass_estimate, carbon_stock, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Measurement not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating measurement ${id}:`, error);
    res.status(500).json({ error: 'Failed to update measurement' });
  }
};

// Delete a measurement
export const deleteMeasurement = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM measurements WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Measurement not found' });
      return;
    }
    
    res.json({ message: 'Measurement deleted successfully' });
  } catch (error) {
    console.error(`Error deleting measurement ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete measurement' });
  }
};
