import { Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: '7889',
  host: 'localhost',
  port: 5432,
  database: 'agromrv'
});

// Get all projects
export const getProjects = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.name as user_name 
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get project by ID
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    // Get project with user info
    const projectResult = await pool.query(`
      SELECT p.*, u.name as user_name 
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);
    
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Get measurements for this project
    const measurementsResult = await pool.query(`
      SELECT * FROM measurements 
      WHERE project_id = $1 
      ORDER BY captured_at DESC
    `, [id]);

    // Combine project with its measurements
    const project = {
      ...projectResult.rows[0],
      measurements: measurementsResult.rows
    };

    res.json(project);
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Create a new project
export const createProject = async (req: Request, res: Response): Promise<void> => {
  const { user_id, project_name, latitude, longitude, crop_type, start_date } = req.body;
  
  // Validation
  if (!user_id || !project_name) {
    res.status(400).json({ error: 'User ID and project name are required' });
    return;
  }

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      res.status(400).json({ error: 'User does not exist' });
      return;
    }

    // Insert project
    const result = await pool.query(
      'INSERT INTO projects (user_id, project_name, latitude, longitude, crop_type, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, project_name, latitude, longitude, crop_type, start_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Update a project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { project_name, latitude, longitude, crop_type, start_date } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE projects SET project_name = $1, latitude = $2, longitude = $3, crop_type = $4, start_date = $5 WHERE id = $6 RETURNING *',
      [project_name, latitude, longitude, crop_type, start_date, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating project ${id}:`, error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(`Error deleting project ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
