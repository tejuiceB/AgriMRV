import express from 'express';
import { 
  getTrees, 
  getTreeById, 
  createTree, 
  updateTree, 
  deleteTree 
} from '../controllers/treeController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Tree routes - All require authentication
router.get('/', authenticate, getTrees);
router.get('/:id', authenticate, getTreeById);
router.post('/', authenticate, createTree);
router.put('/:id', authenticate, updateTree);
router.delete('/:id', authenticate, deleteTree);

export default router;
