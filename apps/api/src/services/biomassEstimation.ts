import pool from '../config/database';

export interface TreeMeasurements {
  height_meters?: number;
  dbh_cm?: number;
  canopy_cover_m2?: number;
  species_code?: string;
}

export interface SpeciesData {
  id: number;
  species_code: string;
  common_name: string;
  scientific_name: string;
  wood_density_kg_m3: number;
  allometric_a: number;
  allometric_b: number;
  uncertainty_pct: number;
  equation_source: string;
}

export interface BiomassEstimate {
  biomass_estimate_kg: number;
  carbon_sequestration_kg: number;
  co2_equivalent_kg: number;
  uncertainty_pct: number;
  method: string;
  confidence_pct: number;
  species_data?: SpeciesData;
}

/**
 * Enhanced Biomass & Carbon Estimation Engine
 * Implements scientifically validated allometric equations
 */
export class BiomassEstimationService {

  /**
   * Get species data from database
   */
  async getSpeciesData(speciesCode: string): Promise<SpeciesData | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM tree_species WHERE species_code = $1',
        [speciesCode.toUpperCase()]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching species data:', error);
      return null;
    }
  }

  /**
   * Estimate biomass using allometric equations
   * 
   * Main equation (Chave et al. 2014): AGB = 0.0673 × (ρ × DBH² × H)^0.976
   * Where:
   * - ρ = wood density (kg/m³)
   * - DBH = diameter at breast height (cm)
   * - H = tree height (m)
   */
  async estimateBiomass(measurements: TreeMeasurements): Promise<BiomassEstimate> {
    const { height_meters, dbh_cm, canopy_cover_m2, species_code } = measurements;

    // Get species-specific parameters
    let speciesData: SpeciesData | null = null;
    if (species_code) {
      speciesData = await this.getSpeciesData(species_code);
    }

    // Use default values if species not found
    const woodDensity = speciesData?.wood_density_kg_m3 || 0.6; // kg/m³
    const allometricA = speciesData?.allometric_a || 0.0673;
    const allometricB = speciesData?.allometric_b || 0.976;
    const speciesUncertainty = speciesData?.uncertainty_pct || 25.0;

    let biomassKg = 0;
    let method = 'default';
    let confidence = 50;

    // Method 1: Full allometric equation (DBH + Height + Species)
    if (dbh_cm && height_meters && dbh_cm > 0 && height_meters > 0) {
      // Standard allometric equation: AGB = a × (ρ × DBH² × H)^b
      const dbhM = dbh_cm / 100; // Convert cm to meters
      biomassKg = allometricA * Math.pow(woodDensity * Math.pow(dbhM, 2) * height_meters, allometricB);
      method = speciesData ? `allometric_species_${species_code}` : 'allometric_generic';
      confidence = speciesData ? (100 - speciesUncertainty) : 75;
    }
    
    // Method 2: Height + Crown area estimation (when DBH not available)
    else if (height_meters && canopy_cover_m2 && height_meters > 0 && canopy_cover_m2 > 0) {
      // Estimate DBH from crown area: DBH ≈ √(crown_area / π) × 0.8
      const crownDiameter = Math.sqrt(canopy_cover_m2 / Math.PI) * 2;
      const estimatedDbhCm = crownDiameter * 80; // Rough crown-to-DBH ratio
      const estimatedDbhM = estimatedDbhCm / 100;
      
      biomassKg = allometricA * Math.pow(woodDensity * Math.pow(estimatedDbhM, 2) * height_meters, allometricB);
      method = 'allometric_crown_estimated';
      confidence = 60; // Lower confidence due to DBH estimation
    }
    
    // Method 3: Height-only estimation (least accurate)
    else if (height_meters && height_meters > 0) {
      // Very simple height-based estimation for young trees
      // Rough formula: biomass ≈ height³ × wood_density × factor
      biomassKg = Math.pow(height_meters, 2.5) * woodDensity * 2.5;
      method = 'height_only_estimation';
      confidence = 40; // Low confidence
    }
    
    // Method 4: Crown area only (for mature trees with spreading canopies)
    else if (canopy_cover_m2 && canopy_cover_m2 > 0) {
      // Estimate from crown area alone (very rough)
      biomassKg = canopy_cover_m2 * woodDensity * 15; // Rough factor
      method = 'crown_area_estimation';
      confidence = 35; // Very low confidence
    }
    
    else {
      throw new Error('Insufficient measurements for biomass estimation');
    }

    // Apply minimum biomass threshold
    biomassKg = Math.max(biomassKg, 0.1);

    // Calculate carbon sequestration (typically 47-50% of biomass)
    const carbonFraction = 0.47; // Conservative estimate
    const carbonKg = biomassKg * carbonFraction;

    // Calculate CO₂ equivalent (molecular weight ratio: 44/12 = 3.67)
    const co2EquivalentKg = carbonKg * 3.67;

    // Calculate uncertainty
    const baseUncertainty = this.getMethodUncertainty(method);
    const finalUncertainty = speciesData ? 
      Math.sqrt(Math.pow(baseUncertainty, 2) + Math.pow(speciesUncertainty, 2)) : 
      baseUncertainty;

    return {
      biomass_estimate_kg: Math.round(biomassKg * 100) / 100,
      carbon_sequestration_kg: Math.round(carbonKg * 100) / 100,
      co2_equivalent_kg: Math.round(co2EquivalentKg * 100) / 100,
      uncertainty_pct: Math.round(finalUncertainty * 10) / 10,
      method,
      confidence_pct: confidence,
      species_data: speciesData || undefined
    };
  }

  /**
   * Get uncertainty percentage based on estimation method
   */
  private getMethodUncertainty(method: string): number {
    const uncertainties: { [key: string]: number } = {
      'allometric_species_': 15,  // Species-specific allometric
      'allometric_generic': 20,   // Generic allometric
      'allometric_crown_estimated': 25, // Crown-estimated DBH
      'height_only_estimation': 35,     // Height only
      'crown_area_estimation': 40       // Crown area only
    };

    for (const [key, uncertainty] of Object.entries(uncertainties)) {
      if (method.includes(key)) {
        return uncertainty;
      }
    }
    
    return 30; // Default uncertainty
  }

  /**
   * Run estimation for multiple trees in a plot
   */
  async estimatePlotBiomass(plotId: string): Promise<{
    trees: Array<{
      tree_id: string;
      estimate: BiomassEstimate;
    }>;
    totals: {
      total_trees: number;
      total_biomass_kg: number;
      total_carbon_kg: number;
      total_co2_equivalent_kg: number;
      average_uncertainty_pct: number;
    };
  }> {
    try {
      // Get all trees for the plot
      const treesResult = await pool.query(
        'SELECT * FROM trees WHERE plot_id = $1 ORDER BY id',
        [plotId]
      );

      const trees = treesResult.rows;
      const estimates = [];
      let totalBiomass = 0;
      let totalCarbon = 0;
      let totalCo2 = 0;
      let totalUncertainty = 0;
      let estimatedTrees = 0;

      // Process each tree
      for (const tree of trees) {
        try {
          const estimate = await this.estimateBiomass({
            height_meters: tree.height_meters,
            dbh_cm: tree.dbh_cm,
            canopy_cover_m2: tree.canopy_cover_m2,
            species_code: tree.species_code
          });

          estimates.push({
            tree_id: tree.id.toString(),
            estimate
          });

          totalBiomass += estimate.biomass_estimate_kg;
          totalCarbon += estimate.carbon_sequestration_kg;
          totalCo2 += estimate.co2_equivalent_kg;
          totalUncertainty += estimate.uncertainty_pct;
          estimatedTrees++;

        } catch (error) {
          console.warn(`Skipping tree ${tree.id}: ${error}`);
        }
      }

      const averageUncertainty = estimatedTrees > 0 ? totalUncertainty / estimatedTrees : 0;

      return {
        trees: estimates,
        totals: {
          total_trees: estimatedTrees,
          total_biomass_kg: Math.round(totalBiomass * 100) / 100,
          total_carbon_kg: Math.round(totalCarbon * 100) / 100,
          total_co2_equivalent_kg: Math.round(totalCo2 * 100) / 100,
          average_uncertainty_pct: Math.round(averageUncertainty * 10) / 10
        }
      };

    } catch (error) {
      console.error('Error estimating plot biomass:', error);
      throw error;
    }
  }

  /**
   * Store estimation results in database
   */
  async storeEstimate(treeId: string, estimate: BiomassEstimate): Promise<any> {
    try {
      const result = await pool.query(`
        INSERT INTO carbon_estimates 
        (tree_id, biomass_estimate_kg, carbon_sequestration_kg, method, confidence_pct)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tree_id) DO UPDATE SET
          biomass_estimate_kg = EXCLUDED.biomass_estimate_kg,
          carbon_sequestration_kg = EXCLUDED.carbon_sequestration_kg,
          method = EXCLUDED.method,
          confidence_pct = EXCLUDED.confidence_pct,
          created_at = NOW()
        RETURNING *
      `, [
        treeId,
        estimate.biomass_estimate_kg,
        estimate.carbon_sequestration_kg,
        estimate.method,
        estimate.confidence_pct
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error storing estimate:', error);
      throw error;
    }
  }

  /**
   * Get all available species for frontend dropdown
   */
  async getAllSpecies(): Promise<SpeciesData[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM tree_species 
        ORDER BY common_name
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching species list:', error);
      return [];
    }
  }
}
