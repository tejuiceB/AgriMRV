import express from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';

const router = express.Router();

// Setup route to check database and create initial user if needed
router.get('/setup', async (req, res) => {
  try {
    // Check if users table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Create users table if it doesn't exist
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'farmer',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('Created users table');
    }

    // Check if any users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(userCount.rows[0].count) === 0) {
      // Create a test user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('password123', saltRounds);
      
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Test User', 'test@example.com', passwordHash, 'farmer']
      );
      
      console.log('Created test user: test@example.com / password123');
    }

    res.json({ 
      success: true, 
      message: 'Setup completed',
      testUser: {
        email: 'test@example.com',
        password: 'password123'
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed', details: error });
  }
});

export default router;
