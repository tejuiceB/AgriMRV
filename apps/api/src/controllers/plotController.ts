import { Request, Response } from 'express';
import pool from '../config/database';

// Get all plots (optionally filtered by user_id)
export const getPlots = async (req: Request, res: Response): Promise<void> => {
  const userId = req.query.user_id as string | undefined;
  
  try {
    let query = 'SELECT * FROM plots';
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plots:', error);
    res.status(500).json({ error: 'Failed to fetch plots' });
  }
};

// Get a plot by ID
export const getPlotById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    // Get plot data
    const plotResult = await pool.query('SELECT * FROM plots WHERE id = $1', [id]);
    
    if (plotResult.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found' });
      return;
    }
    
    // Get trees for this plot
    const treesResult = await pool.query(
      'SELECT * FROM trees WHERE plot_id = $1 ORDER BY captured_at DESC',
      [id]
    );
    
    // Combine plot with its trees
    const plot = {
      ...plotResult.rows[0],
      trees: treesResult.rows
    };
    
    res.json(plot);
  } catch (error) {
    console.error(`Error fetching plot ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch plot' });
  }
};

// Create a new plot
export const createPlot = async (req: Request, res: Response): Promise<void> => {
  const { user_id, name, latitude, longitude, area_hectares } = req.body;
  
  // Validation
  if (!user_id || !name) {
    res.status(400).json({ error: 'User ID and plot name are required' });
    return;
  }
  
  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      res.status(400).json({ error: 'User does not exist' });
      return;
    }
    
    // Create plot
    const result = await pool.query(
      'INSERT INTO plots (user_id, name, latitude, longitude, area_hectares) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, name, latitude, longitude, area_hectares]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating plot:', error);
    res.status(500).json({ error: 'Failed to create plot' });
  }
};

// Update a plot
export const updatePlot = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, latitude, longitude, area_hectares } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE plots SET name = $1, latitude = $2, longitude = $3, area_hectares = $4 WHERE id = $5 RETURNING *',
      [name, latitude, longitude, area_hectares, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating plot ${id}:`, error);
    res.status(500).json({ error: 'Failed to update plot' });
  }
};

// Delete a plot
export const deletePlot = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM plots WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found' });
      return;
    }
    
    res.json({ message: 'Plot deleted successfully' });
  } catch (error) {
    console.error(`Error deleting plot ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete plot' });
  }
};
