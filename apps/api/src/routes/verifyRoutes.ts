import express from 'express';
import * as blockchainController from '../controllers/blockchainController';

const router = express.Router();

// GET /verify - Get all blockchain records
router.get('/', blockchainController.getBlockchainRecords);

// GET /verify/:id - Get blockchain record by ID
router.get('/:id', blockchainController.getBlockchainRecordById);

// POST /verify - Create a new blockchain record (verify measurement)
router.post('/', blockchainController.createBlockchainRecord);

// PUT /verify/:id - Update a blockchain record
router.put('/:id', blockchainController.updateBlockchainRecord);

// DELETE /verify/:id - Delete a blockchain record
router.delete('/:id', blockchainController.deleteBlockchainRecord);

export default router;
