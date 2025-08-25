import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { writeFileRel, ensureStorage } from '../utils/storage';
import { sha256OfFile, sha256OfString } from '../utils/hash';

export async function exportMRVPackage(plotId: string) {
  try {
    // ensure storage exists
    ensureStorage();
    
    // gather data - using direct SQL queries
    const plotResult = await pool.query('SELECT * FROM "Plot" WHERE id = $1', [plotId]);
    if (plotResult.rows.length === 0) throw new Error('Plot not found');
    const plot = plotResult.rows[0];

    // Get trees with estimates and species
    const treesResult = await pool.query(`
      SELECT t.*, e.*, s.* 
      FROM "Tree" t 
      LEFT JOIN "CarbonEstimate" e ON t."id" = e."treeId" 
      LEFT JOIN "Species" s ON t."speciesCode" = s."code"
      WHERE t."plotId" = $1
    `, [plotId]);
    const trees = treesResult.rows;

  const totals = {
    totalTrees: trees.length,
    plotAGBTons: trees.reduce((a: number, b: any) => a + (b.agbKg ?? 0), 0)/1000,
    plotCarbonTons: trees.reduce((a: number, b: any) => a + (b.carbonKg ?? 0), 0)/1000,
  };

  const timestamp = new Date().toISOString().replace(/[:.-]/g,'').slice(0,15)+'Z';
  const folder = `mrv_pkg_${plotId}_${timestamp}`;
  const relBase = path.join('packages', folder);

  // artifacts
  const inputs = {
    plot: {
      id: plot.id,
      name: plot.name,
      agroEcozone: plot.agroEcozone,
      boundaryGeojson: plot.boundaryGeojson,
    },
    trees: trees.map((t: any) => ({
      id: t.id,
      speciesCode: t.speciesCode,
      speciesName: t.commonName,  // Species name is now directly in the tree object from the join
      heightM: t.heightM,
      dbhCm: t.dbhCm,
      crownAreaM2: t.crownAreaM2,
      health: t.health,
    }))
  };

  const outputs = {
    perTree: trees.map((t: any) => ({
      id: t.id,
      agbKg: t.agbKg ?? null,
      carbonKg: t.carbonKg ?? null,
      uncPct: t.uncPct ?? null,
      method: t.method ?? null,
      modelVer: t.modelVer ?? null,
    })),
    totals
  };

  const manifest = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    plotId: plot.id,
    method: {
      name: "Agroforestry Carbon Stock Estimator",
      modelVersion: "v0.1",
      codeCommit: process.env.CODE_COMMIT || "unknown",
      parameters: {
        carbonFraction: 0.47,
        defaultWoodDensity: 0.60,
      }
    },
    uncertainty: {
      approach: "fixed-uncertainty MVP",
      valuePct: 0.20
    },
    provenance: {
      app: "agro-mrv",
      env: process.env.NODE_ENV || "development"
    }
  };

  const summary = `# MRV Summary
- Plot: ${plot.name} (${plot.id})
- Trees: ${totals.totalTrees}
- AGB: ${totals.plotAGBTons.toFixed(3)} t
- Carbon: ${totals.plotCarbonTons.toFixed(3)} t C
- Generated: ${new Date().toISOString()}
`;

  // write files
  const pInputs = path.join(relBase, 'inputs', 'trees.json');
  const pOutputs = path.join(relBase, 'outputs', 'estimates.json');
  const pManifest = path.join(relBase, 'manifest.json');
  const pReport = path.join(relBase, 'reports', 'summary.md');

  writeFileRel(pInputs, JSON.stringify(inputs, null, 2));
  writeFileRel(pOutputs, JSON.stringify(outputs, null, 2));
  writeFileRel(pManifest, JSON.stringify(manifest, null, 2));
  writeFileRel(pReport, summary);

  // checksums
  const checksums: { files: Record<string, string> } = {
    files: {}
  };
  
  // Handle file hashing with error checking
  try {
    checksums.files = {
      [pInputs]: sha256OfFile(`storage/${pInputs}`),
      [pOutputs]: sha256OfFile(`storage/${pOutputs}`),
      [pManifest]: sha256OfFile(`storage/${pManifest}`),
      [pReport]: sha256OfFile(`storage/${pReport}`),
    };
  } catch (error) {
    console.error('Error generating file checksums:', error);
    throw new Error(`Failed to generate checksums: ${(error as Error).message}`);
  }
  const pChecks = path.join(relBase, 'checksums.json');
  writeFileRel(pChecks, JSON.stringify(checksums, null, 2));

  // top-level hash: hash of concatenated file hashes (stable order)
  const concat = Object.keys(checksums.files).sort().map(k => checksums.files[k]).join('|');
  const topHash = sha256OfString(concat);

  // persist MRVPackage row (artifactsUri points to folder)
  const runResult = await pool.query(
    'SELECT * FROM "Run" WHERE "plotId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
    [plotId]
  );
  const run = runResult.rows[0];
  
  const pkgResult = await pool.query(
    `INSERT INTO "MRVPackage" ("runId", "schemaVersion", "artifactsUri", "checksum", "createdAt")
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [
      run?.id ?? plot.id, // fallback
      "1.0", 
      `file://${path.resolve(process.cwd(), 'storage', relBase)}`,
      topHash
    ]
  );
  const pkg = pkgResult.rows[0];

  return { pkgId: pkg.id, topHash, artifactsUri: pkg.artifactsUri, relBase };
  } catch (error) {
    console.error('Error in MRV export:', error);
    throw error;
  }
}
