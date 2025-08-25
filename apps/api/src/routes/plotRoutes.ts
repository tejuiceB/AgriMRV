import express from 'express';
import { 
  getPlots, 
  getPlotById, 
  createPlot, 
  updatePlot, 
  deletePlot
} from '../controllers/plotController';
import { getTrees, createTree } from '../controllers/treeController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Plot routes - All require authentication
router.get('/', authenticate, getPlots);
router.get('/:id', authenticate, getPlotById);
router.post('/', authenticate, createPlot);
router.put('/:id', authenticate, updatePlot);
router.delete('/:id', authenticate, deletePlot);

// Nested tree routes - trees associated with a specific plot
router.get('/:id/trees', authenticate, (req, res, next) => {
  // Set the plot_id from URL parameter and forward to getTrees
  req.query.plot_id = req.params.id;
  next();
}, getTrees);

router.post('/:id/trees', authenticate, (req, res, next) => {
  // Add the plot_id from URL parameter to the request body
  req.body.plot_id = req.params.id;
  next();
}, createTree);

export default router;
