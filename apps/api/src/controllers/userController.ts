import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: '7889',
  host: 'localhost',
  port: 5432,
  database: 'agromrv'
});

// Get all users
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, role } = req.body;
  
  // Validation
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  
  if (role && !['farmer', 'auditor', 'registry'].includes(role)) {
    res.status(400).json({ error: 'Role must be one of: farmer, auditor, registry' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *',
      [name, email, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
      [name, email, role, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
