import express from 'express';
import { 
  getLedgerEntries, 
  getLedgerEntryById, 
  createLedgerEntry 
} from '../controllers/ledgerController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Ledger routes - Public read, authenticated write
// Anyone can view ledger entries for transparency
router.get('/', getLedgerEntries);
router.get('/:id', getLedgerEntryById);
// Only auditors and carbon registries can create ledger entries (verification)
router.post('/', authenticate, authorize(['auditor', 'registry']), createLedgerEntry);

export default router;
