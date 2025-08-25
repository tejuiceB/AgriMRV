import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Extend Express Request interface for multer
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/');
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Create unique filename with timestamp and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false); // Reject file without error
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Upload tree image with metadata
router.post('/tree-image', authenticate, upload.single('treeImage'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const { plot_id, location, tree_type, latitude, longitude, notes } = req.body;
    const imagePath = req.file.path;
    const userId = req.user?.id;

    console.log('Upload request:', {
      plot_id,
      location,
      tree_type,
      latitude,
      longitude,
      notes,
      imagePath,
      userId
    });

    // Validate required fields
    if (!plot_id) {
      res.status(400).json({ error: 'Plot ID is required' });
      return;
    }

    // Check if plot exists and belongs to user
    const plotResult = await pool.query(
      'SELECT id FROM plots WHERE id = $1 AND user_id = $2',
      [plot_id, userId]
    );

    if (plotResult.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found or access denied' });
      return;
    }

    // Insert tree image data
    const result = await pool.query(
      `INSERT INTO tree_images 
       (plot_id, user_id, location, tree_type, image_path, latitude, longitude, notes, uploaded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [plot_id, userId, location, tree_type, imagePath, latitude, longitude, notes]
    );

    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Tree image uploaded successfully'
    });

  } catch (error: any) {
    console.error('Error uploading tree image:', error);
    
    // Clean up uploaded file if database insert fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload tree image' });
  }
});

// Get all tree images for a plot
router.get('/plot/:plotId/images', authenticate, async (req: Request, res: Response) => {
  try {
    const { plotId } = req.params;
    const userId = req.user?.id;

    // Check if plot belongs to user
    const plotResult = await pool.query(
      'SELECT id FROM plots WHERE id = $1 AND user_id = $2',
      [plotId, userId]
    );

    if (plotResult.rows.length === 0) {
      res.status(404).json({ error: 'Plot not found or access denied' });
      return;
    }

    // Get all images for this plot
    const result = await pool.query(
      'SELECT * FROM tree_images WHERE plot_id = $1 ORDER BY uploaded_at DESC',
      [plotId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tree images:', error);
    res.status(500).json({ error: 'Failed to fetch tree images' });
  }
});

// Get a specific tree image
router.get('/image/:imageId', authenticate, async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const userId = req.user?.id;

    // Get image with plot ownership check
    const result = await pool.query(
      `SELECT ti.*, p.name as plot_name 
       FROM tree_images ti 
       JOIN plots p ON ti.plot_id = p.id 
       WHERE ti.id = $1 AND ti.user_id = $2`,
      [imageId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Image not found or access denied' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tree image:', error);
    res.status(500).json({ error: 'Failed to fetch tree image' });
  }
});

// Delete a tree image
router.delete('/image/:imageId', authenticate, async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const userId = req.user?.id;

    // Get image path before deletion
    const imageResult = await pool.query(
      'SELECT image_path FROM tree_images WHERE id = $1 AND user_id = $2',
      [imageId, userId]
    );

    if (imageResult.rows.length === 0) {
      res.status(404).json({ error: 'Image not found or access denied' });
      return;
    }

    const imagePath = imageResult.rows[0].image_path;

    // Delete from database
    await pool.query('DELETE FROM tree_images WHERE id = $1', [imageId]);

    // Delete file from filesystem
    try {
      fs.unlinkSync(imagePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue even if file deletion fails
    }

    res.json({ message: 'Tree image deleted successfully' });
  } catch (error) {
    console.error('Error deleting tree image:', error);
    res.status(500).json({ error: 'Failed to delete tree image' });
  }
});

// Serve uploaded images
router.get('/serve/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, '../../uploads', filename);
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Error serving image:', err);
      res.status(404).json({ error: 'Image not found' });
    }
  });
});

export default router;
