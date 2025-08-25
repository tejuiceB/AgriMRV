import { Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../config/database';

// Get all ledger entries
export const getLedgerEntries = async (req: Request, res: Response): Promise<void> => {
  const estimateId = req.query.estimate_id as string | undefined;
  
  try {
    let query = 'SELECT * FROM ledger';
    let params: any[] = [];
    
    if (estimateId) {
      query += ' WHERE estimate_id = $1';
      params.push(estimateId);
    }
    
    query += ' ORDER BY verified_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
};

// Get a ledger entry by ID
export const getLedgerEntryById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM ledger WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ledger entry not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching ledger entry ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch ledger entry' });
  }
};

// Create a new ledger entry (verify carbon estimate)
export const createLedgerEntry = async (req: Request, res: Response): Promise<void> => {
  const { estimate_id, tx_id } = req.body;
  
  // Validation
  if (!estimate_id) {
    res.status(400).json({ error: 'Carbon estimate ID is required' });
    return;
  }
  
  try {
    // Check if estimate exists
    const estimateResult = await pool.query('SELECT * FROM carbon_estimates WHERE id = $1', [estimate_id]);
    if (estimateResult.rows.length === 0) {
      res.status(400).json({ error: 'Carbon estimate does not exist' });
      return;
    }
    
    // Check if this estimate is already verified in the ledger
    const existingEntry = await pool.query('SELECT * FROM ledger WHERE estimate_id = $1', [estimate_id]);
    if (existingEntry.rows.length > 0) {
      res.status(409).json({ error: 'This carbon estimate is already verified' });
      return;
    }
    
    // In a real blockchain scenario, we'd get these values from the blockchain
    // For now, generate a mock hash and block number
    const estimate = estimateResult.rows[0];
    const dataToHash = JSON.stringify(estimate) + new Date().toISOString();
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    const block_number = Math.floor(Math.random() * 1000000) + 1000000;
    
    // Create ledger entry
    const result = await pool.query(
      'INSERT INTO ledger (estimate_id, hash, block_number, tx_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [estimate_id, hash, block_number, tx_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating ledger entry:', error);
    res.status(500).json({ error: 'Failed to create ledger entry' });
  }
};
