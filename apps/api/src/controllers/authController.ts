import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role = 'farmer' } = req.body;
  
  // Validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Login a user
export const login = async (req: Request, res: Response): Promise<void> => {
  console.log('Login attempt:', req.body);
  
  const { email, password } = req.body;
  
  // Validation
  if (!email || !password) {
    console.log('Login failed: Missing email or password');
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  
  try {
    // Check database connection
    try {
      await pool.query('SELECT NOW()');
    } catch (dbError) {
      console.error('Database connection error during login:', dbError);
      res.status(500).json({ error: 'Database connection error' });
      return;
    }
    
    // Find user
    console.log('Finding user with email:', email);
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('User not found with email:', email);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    
    const user = result.rows[0];
    console.log('User found:', { id: user.id, email: user.email, role: user.role });
    
    // Check if password_hash exists
    if (!user.password_hash) {
      console.error('User has no password hash!', user.id);
      res.status(401).json({ error: 'Account setup incomplete' });
      return;
    }
    
    // Verify password
    console.log('Verifying password');
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('Invalid password for user:', user.id);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    
    // Generate JWT token
    console.log('Generating JWT token');
    const { id, name, role } = user;
    const token = jwt.sign(
      { id, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for user:', user.id);
    
    // Return user info and token
    res.json({ 
      user: { id, name, email, role },
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Get user profile (requires authentication)
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  // User is already authenticated via middleware
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  try {
    // Get user data
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};
