import { z } from "zod";

export const ExportTreeRow = z.object({
  projectId: z.string(),
  plotId: z.string(),
  treeId: z.string(),
  farmerId: z.string().optional().nullable(),
  speciesCode: z.string().optional().nullable(),
  speciesName: z.string().optional().nullable(),
  lat: z.number().nullable(),   // centroid or tree gps if you have
  lon: z.number().nullable(),
  heightM: z.number().nullable(),
  dbhCm: z.number().nullable(),
  crownAreaM2: z.number().nullable(),
  agbKg: z.number().nullable(),
  carbonKg: z.number().nullable(),
  uncertaintyPct: z.number().nullable(), // 0.2 = 20%
  method: z.string().nullable(),
  modelVer: z.string().nullable(),
  measuredAt: z.string().optional().nullable(), // ISO 8601
});

export type ExportTreeRow = z.infer<typeof ExportTreeRow>;

export const ExportPlotRow = z.object({
  projectId: z.string(),
  plotId: z.string(),
  plotName: z.string(),
  agroEcozone: z.string().optional().nullable(),
  areaHa: z.number().nullable(),
  centroidLat: z.number().nullable(),
  centroidLon: z.number().nullable(),
  trees: z.number(),
  plotAGBTons: z.number(),    // total AGB (t)
  plotCarbonTons: z.number(), // total Carbon (t)
  generatedAt: z.string(),    // ISO
});
export type ExportPlotRow = z.infer<typeof ExportPlotRow>;
