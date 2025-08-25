import { Router } from 'express';
import { exportMRVPackage } from '../services/mrvExport';
import { anchorHash } from '../services/ledger';
import fs from 'fs';
import path from 'path';
import { sha256OfFile, sha256OfString } from '../utils/hash';
import pool from '../config/database';

const r = Router();

// Generate MRV package for a plot
r.post('/plots/:plotId/mrv/export', async (req, res) => {
  try {
    const { plotId } = req.params;
    const { pkgId, topHash, artifactsUri, relBase } = await exportMRVPackage(plotId);
    // optional: immediately anchor
    const { txId } = await anchorHash(pkgId, topHash);
    res.json({ pkgId, hash: topHash, artifactsUri, ledgerTxId: txId });
  } catch (error: any) {
    console.error('Error exporting MRV package:', error);
    res.status(500).json({ error: error.message || 'Failed to export MRV package' });
  }
});

// Verify integrity of an existing package
r.get('/mrv/:pkgId/verify', async (req, res) => {
  try {
    const { pkgId } = req.params;
    const pkgResult = await pool.query('SELECT * FROM "MRVPackage" WHERE id = $1', [pkgId]);
    if (pkgResult.rows.length === 0) return res.status(404).json({ error: 'Package not found' });
    const pkg = pkgResult.rows[0];

    // recompute top-level hash
    const folder = pkg.artifactsUri.replace('file://', '');
    if (!fs.existsSync(folder)) {
      return res.status(404).json({ error: 'Package files not found' });
    }

    const checksumPath = path.join(folder, 'checksums.json');
    if (!fs.existsSync(checksumPath)) {
      return res.status(404).json({ error: 'Checksums file not found' });
    }

    const checksums = JSON.parse(fs.readFileSync(checksumPath, 'utf8'));
    const fileKeys = Object.keys(checksums.files).sort();
    const recomputedConcat = fileKeys.map(k => sha256OfFile(path.join(process.cwd(), 'storage', k))).join('|');
    const recomputed = sha256OfString(recomputedConcat);

    res.json({
      pkgId,
      storedChecksum: pkg.checksum,
      recomputedChecksum: recomputed,
      matches: pkg.checksum === recomputed,
      ledgerTxId: pkg.ledgerTxId
    });
  } catch (error: any) {
    console.error('Error verifying MRV package:', error);
    res.status(500).json({ error: error.message || 'Failed to verify MRV package' });
  }
});

export default r;
