import express from 'express';
import { 
  getCarbonEstimates, 
  getCarbonEstimateById, 
  createCarbonEstimate,
  updateCarbonEstimate,
  deleteCarbonEstimate
} from '../controllers/carbonController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Carbon estimate routes - All require authentication
router.get('/', authenticate, getCarbonEstimates);
router.get('/:id', authenticate, getCarbonEstimateById);
router.post('/', authenticate, createCarbonEstimate);
router.put('/:id', authenticate, updateCarbonEstimate);
router.delete('/:id', authenticate, deleteCarbonEstimate);

export default router;
