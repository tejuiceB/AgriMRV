import express from 'express';
import * as measurementController from '../controllers/measurementController';

const router = express.Router();

// GET /measurements - Get all measurements
router.get('/', measurementController.getMeasurements);

// GET /measurements/:id - Get measurement by ID
router.get('/:id', measurementController.getMeasurementById);

// POST /measurements - Create a new measurement
router.post('/', measurementController.createMeasurement);

// PUT /measurements/:id - Update a measurement
router.put('/:id', measurementController.updateMeasurement);

// DELETE /measurements/:id - Delete a measurement
router.delete('/:id', measurementController.deleteMeasurement);

export default router;
