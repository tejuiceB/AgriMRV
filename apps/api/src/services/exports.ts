import pool from "../config/database";
import { ExportTreeRow, ExportPlotRow } from "../exports/schema";

// Define types for database results to avoid 'any' errors
type DbTree = {
  id: number;
  plot_id: number;
  height_meters: number | null;
  canopy_cover_m2: number | null;
  dbh_cm: number | null;
  species_code: string | null;
  health_status: string | null;
  captured_at: string | null;
  biomass_estimate_kg?: number | null;
  carbon_sequestration_kg?: number | null;
  confidence_pct?: number | null;
  method?: string | null;
};

type DbPlot = {
  id: number;
  user_id?: number | null;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  area_hectares?: number | null;
  created_at?: string | null;
};

function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const head = cols.join(",") + "\n";
  const body = rows.map(r =>
    cols.map(c => {
      const v = r[c];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(",")
  ).join("\n");
  return head + body + "\n";
}

export async function buildTreeRows(plotId: string) {
  console.log(`Starting buildTreeRows for plot ${plotId}`);
  
  try {
    // Get plot data
    console.log('Querying plot data...');
    const plotResult = await pool.query('SELECT * FROM plots WHERE id = $1', [plotId]);
    
    if (plotResult.rows.length === 0) {
      console.error(`Plot not found: ${plotId}`);
      throw new Error("Plot not found");
    }
    
    const plot = plotResult.rows[0] as DbPlot;
    console.log(`Found plot: ${plot.id} - ${plot.name}`);
    
    // Get trees with estimates
    console.log('Querying tree data...');
    const treeResult = await pool.query(`
      SELECT t.*, c.biomass_estimate_kg, c.carbon_sequestration_kg, c.confidence_pct, c.method
      FROM trees t
      LEFT JOIN carbon_estimates c ON t.id = c.tree_id
      WHERE t.plot_id = $1
      ORDER BY t.id
    `, [plotId]);
    
    const trees = treeResult.rows as DbTree[];
    console.log(`Found ${trees.length} trees`);
    
    // Log tree data for debugging
    if (trees.length > 0) {
      const sampleTree = trees[0];
      console.log('Sample tree data:', {
        id: sampleTree.id,
        species: sampleTree.species_code,
        height: sampleTree.height_meters,
        dbh: sampleTree.dbh_cm,
        canopy: sampleTree.canopy_cover_m2
      });
    }

    // Since we don't have GeoJSON boundary, use simple centroid if available
    const centroid = {
      lat: plot.latitude || null,
      lon: plot.longitude || null
    };
    
    const projectId = plot.id; // or a parent project ID if you have one

    const rows = trees.map((t: DbTree) => ({
      projectId,
      plotId: plot.id,
      treeId: t.id.toString(),
      farmerId: plot.user_id?.toString() ?? null,
      speciesCode: t.species_code ?? null,
      speciesName: null, // We don't have species name in this schema
      lat: centroid?.lat ?? null,
      lon: centroid?.lon ?? null,
      heightM: t.height_meters ?? null,
      dbhCm: t.dbh_cm ?? null,
      crownAreaM2: t.canopy_cover_m2 ?? null,
      agbKg: t.biomass_estimate_kg ?? null,
      carbonKg: t.carbon_sequestration_kg ?? null,
      uncertaintyPct: t.confidence_pct ? t.confidence_pct / 100 : null, // Convert from percentage to decimal
      method: t.method ?? null,
      modelVer: "v0.1", // Hardcoded for now
      measuredAt: t.captured_at ? new Date(t.captured_at).toISOString() : null,
    }));

    // Define a type for the unvalidated tree row
    type UnvalidatedTreeRow = {
      projectId: number | string;
      plotId: number | string;
      treeId: string;
      farmerId: string | null;
      speciesCode: string | null;
      speciesName: string | null;
      lat: number | null;
      lon: number | null;
      heightM: number | null;
      dbhCm: number | null;
      crownAreaM2: number | null;
      agbKg: number | null;
      carbonKg: number | null;
      uncertaintyPct: number | null;
      method: string | null;
      modelVer: string | null;
      measuredAt: string | null;
    };
    
    // Validate each row
    const validated = rows.map((r) => ExportTreeRow.parse(r as UnvalidatedTreeRow));
    console.log(`Successfully validated ${validated.length} tree rows`);
    return validated;
    
  } catch (error) {
    console.error('Error in buildTreeRows:', error);
    throw error;
  }
}

export async function buildPlotRow(plotId: string) {
  try {
    console.log(`Building plot row for plot ${plotId}`);
    
    // Get plot data
    const plotResult = await pool.query('SELECT * FROM plots WHERE id = $1', [plotId]);
    if (plotResult.rows.length === 0) throw new Error("Plot not found");
    const plot = plotResult.rows[0] as DbPlot;
    
    // Get trees with estimates for totals
    const treeResult = await pool.query(`
      SELECT t.*, c.biomass_estimate_kg, c.carbon_sequestration_kg
      FROM trees t
      LEFT JOIN carbon_estimates c ON t.id = c.tree_id
      WHERE t.plot_id = $1
    `, [plotId]);
    
    const trees = treeResult.rows as DbTree[];

    // Calculate totals
    const plotAGBTons = trees.reduce((a: number, b: DbTree) => a + (b.biomass_estimate_kg ?? 0), 0) / 1000;
    const plotCarbonTons = trees.reduce((a: number, b: DbTree) => a + (b.carbon_sequestration_kg ?? 0), 0) / 1000;

    const row = {
      projectId: plot.id.toString(),
      plotId: plot.id.toString(),
      plotName: plot.name || plot.id.toString(),
      agroEcozone: null, // Not in our current schema
      areaHa: plot.area_hectares ?? null,
      centroidLat: plot.latitude ?? null,
      centroidLon: plot.longitude ?? null,
      trees: trees.length,
      plotAGBTons,
      plotCarbonTons,
      generatedAt: new Date().toISOString(),
    };

    console.log(`Successfully built plot row with ${trees.length} trees`);
    return ExportPlotRow.parse(row);
    
  } catch (error) {
    console.error('Error in buildPlotRow:', error);
    throw error;
  }
}

export function toCsvBuffers(treeRows: ReturnType<typeof ExportTreeRow.parse>[], plotRow: ReturnType<typeof ExportPlotRow.parse>) {
  const treesCsv = toCsv(treeRows);
  const plotCsv = toCsv([plotRow]);
  return {
    treesCsvBuf: Buffer.from(treesCsv, 'utf8'),
    plotCsvBuf: Buffer.from(plotCsv, 'utf8')
  };
}
