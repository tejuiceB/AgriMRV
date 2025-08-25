import express, { Router } from "express";
import { buildPlotRow, buildTreeRows, toCsvBuffers } from "../services/exports";
import { authenticate } from "../middleware/auth";
// Import schema now that zod is installed
import { ExportTreeRow } from "../exports/schema";
// Note: You'll need to install archiver: npm install archiver
// For TypeScript: npm install @types/archiver --save-dev

// Import archiver now that it's installed
import archiver from 'archiver';

const router = Router();

// Validate (returns issues if any mandatory values are missing)
router.get('/exports/plots/:plotId/validate', authenticate, async (req, res) => {
  console.log(`Validating export for plot: ${req.params.plotId}`, {
    user: req.user?.id || 'unknown'
  });
  
  try {
    console.log('Building tree rows...');
    const trees = await buildTreeRows(req.params.plotId);
    console.log(`Got ${trees.length} trees`);
    
    console.log('Building plot row...');
    const plot = await buildPlotRow(req.params.plotId);
    console.log('Plot data:', {
      plotId: plot.plotId,
      trees: plot.trees,
      plotName: plot.plotName
    });
    
    // MVP: consider missing critical fields
    const issues: string[] = [];
    trees.forEach((t, i: number) => {
      if (!t.heightM && !t.dbhCm) {
        issues.push(`Tree ${t.treeId}: heightM or dbhCm required`);
        console.log(`Tree ${t.treeId} is missing required data:`, {
          heightM: t.heightM,
          dbhCm: t.dbhCm
        });
      }
      if (!t.speciesCode) issues.push(`Tree ${t.treeId}: species required`);
    });
    
    if (plot.trees === 0) {
      issues.push('No trees in plot');
      console.log('Plot has no trees');
    }
    
    const result = { 
      ok: issues.length === 0, 
      issues, 
      counts: { trees: trees.length } 
    };
    
    console.log('Validation result:', result);
    res.json(result);
  } catch (e: any) {
    console.error('Error validating export:', e);
    res.status(400).json({ ok: false, error: e.message, issues: ['Error validating export: ' + e.message] });
  }
});

// CSV export (single plot, zipped with README)
router.get('/exports/plots/:plotId/csv.zip', authenticate, async (req, res) => {
  try {

    const trees = await buildTreeRows(req.params.plotId);
    const plot = await buildPlotRow(req.params.plotId);
    const { treesCsvBuf, plotCsvBuf } = toCsvBuffers(trees, plot);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="plot_${req.params.plotId}_export.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 }});
    archive.pipe(res);
    archive.append(plotCsvBuf, { name: 'plot_summary.csv' });
    archive.append(treesCsvBuf, { name: 'tree_level.csv' });
    archive.append(Buffer.from(`# Data Dictionary
- plot_summary.csv: one row per plot
- tree_level.csv: one row per tree

Units:
- heightM (m), dbhCm (cm), crownAreaM2 (m^2)
- agbKg (kg), carbonKg (kg); totals in tons in plot_summary

Timestamps are ISO 8601 (UTC).
`,'utf8'), { name: 'README.md' });
    archive.finalize();
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// JSON export (for APIs/registries)
router.get('/exports/plots/:plotId.json', authenticate, async (req, res) => {
  try {
    const trees = await buildTreeRows(req.params.plotId);
    const plot = await buildPlotRow(req.params.plotId);
    res.json({ plot, trees, schemaVersion: '1.0' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
