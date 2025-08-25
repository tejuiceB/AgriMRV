import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: '7889',
  host: 'localhost',
  port: 5432,
  database: 'agromrv'
});

// Get all blockchain records
export const getBlockchainRecords = async (req: Request, res: Response): Promise<void> => {
  const measurementId = req.query.measurement_id;
  const verified = req.query.verified;
  
  try {
    let query = 'SELECT * FROM blockchain_records';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Build WHERE clause
    if (measurementId || verified !== undefined) {
      query += ' WHERE';
      
      if (measurementId) {
        query += ` measurement_id = $${paramIndex++}`;
        params.push(measurementId);
      }
      
      if (verified !== undefined) {
        if (paramIndex > 1) query += ' AND';
        query += ` verified = $${paramIndex++}`;
        params.push(verified === 'true');
      }
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blockchain records:', error);
    res.status(500).json({ error: 'Failed to fetch blockchain records' });
  }
};

// Get blockchain record by ID
export const getBlockchainRecordById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM blockchain_records WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Blockchain record not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching blockchain record ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch blockchain record' });
  }
};

// Create a new blockchain record (verify measurement)
export const createBlockchainRecord = async (req: Request, res: Response): Promise<void> => {
  const { measurement_id, tx_hash } = req.body;
  
  // Validation
  if (!measurement_id || !tx_hash) {
    res.status(400).json({ error: 'Measurement ID and transaction hash are required' });
    return;
  }

  try {
    // Check if measurement exists
    const measurementResult = await pool.query('SELECT id FROM measurements WHERE id = $1', [measurement_id]);
    if (measurementResult.rows.length === 0) {
      res.status(400).json({ error: 'Measurement does not exist' });
      return;
    }

    // Insert blockchain record
    const result = await pool.query(
      'INSERT INTO blockchain_records (measurement_id, tx_hash, verified) VALUES ($1, $2, $3) RETURNING *',
      [measurement_id, tx_hash, true]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating blockchain record:', error);
    res.status(500).json({ error: 'Failed to create blockchain record' });
  }
};

// Update a blockchain record
export const updateBlockchainRecord = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { tx_hash, verified } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE blockchain_records SET tx_hash = $1, verified = $2 WHERE id = $3 RETURNING *',
      [tx_hash, verified, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Blockchain record not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating blockchain record ${id}:`, error);
    res.status(500).json({ error: 'Failed to update blockchain record' });
  }
};

// Delete a blockchain record
export const deleteBlockchainRecord = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM blockchain_records WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Blockchain record not found' });
      return;
    }
    
    res.json({ message: 'Blockchain record deleted successfully' });
  } catch (error) {
    console.error(`Error deleting blockchain record ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete blockchain record' });
  }
};
