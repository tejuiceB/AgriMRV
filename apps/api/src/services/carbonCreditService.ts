import pool from '../config/database';

/**
 * Carbon Credit Calculation & Pricing Engine
 * Converts biomass measurements into tradable carbon credits with market pricing
 */

// IPCC Standard Constants
const CARBON_FRACTION = 0.47; // 47% of biomass is carbon
const CO2_MOLECULAR_RATIO = 3.67; // CO2/C molecular weight ratio

// Market price data structure
export interface MarketPrice {
  id: number;
  price_usd: number;
  price_inr: number;
  market_name: string;
  date: string;
  source: string;
}

// Carbon credit calculation result
export interface CarbonCreditResult {
  biomass_kg: number;
  carbon_stock_kg: number;
  carbon_stock_tons: number;
  co2_equivalent_kg: number;
  co2_equivalent_tons: number;
  credits_generated: number;
  market_price_usd: number;
  market_price_inr: number;
  estimated_value_usd: number;
  estimated_value_inr: number;
  calculation_date: string;
  methodology: string;
}

export class CarbonCreditService {
  
  /**
   * Calculate carbon credits from biomass data
   */
  static calculateCredits(biomassKg: number): {
    carbonStockKg: number;
    carbonStockTons: number;
    co2EquivalentKg: number;
    co2EquivalentTons: number;
    creditsGenerated: number;
  } {
    // Step 1: Calculate carbon stock (tons C)
    const carbonStockKg = biomassKg * CARBON_FRACTION;
    const carbonStockTons = carbonStockKg / 1000;
    
    // Step 2: Calculate CO2 equivalent (tCO2e)
    const co2EquivalentKg = carbonStockKg * CO2_MOLECULAR_RATIO;
    const co2EquivalentTons = co2EquivalentKg / 1000;
    
    // Step 3: Credits = CO2 equivalent (1 credit = 1 tCO2e)
    const creditsGenerated = co2EquivalentTons;
    
    return {
      carbonStockKg: Math.round(carbonStockKg * 100) / 100,
      carbonStockTons: Math.round(carbonStockTons * 1000) / 1000,
      co2EquivalentKg: Math.round(co2EquivalentKg * 100) / 100,
      co2EquivalentTons: Math.round(co2EquivalentTons * 1000) / 1000,
      creditsGenerated: Math.round(creditsGenerated * 1000) / 1000
    };
  }

  /**
   * Get latest market prices for carbon credits
   */
  static async getLatestMarketPrice(): Promise<MarketPrice | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM carbon_market_prices 
        ORDER BY date DESC 
        LIMIT 1
      `);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching market price:', error);
      return null;
    }
  }

  /**
   * Calculate full carbon credit result with market pricing
   */
  static async calculateCarbonCreditsWithPricing(biomassKg: number): Promise<CarbonCreditResult> {
    // Calculate carbon metrics
    const credits = this.calculateCredits(biomassKg);
    
    // Get market pricing
    const marketPrice = await this.getLatestMarketPrice();
    const priceUSD = marketPrice?.price_usd || 8.50; // Default $8.50/credit
    const priceINR = marketPrice?.price_inr || 700; // Default ₹700/credit
    
    // Calculate monetary value
    const estimatedValueUSD = Math.round(credits.creditsGenerated * priceUSD * 100) / 100;
    const estimatedValueINR = Math.round(credits.creditsGenerated * priceINR * 100) / 100;
    
    return {
      biomass_kg: biomassKg,
      carbon_stock_kg: credits.carbonStockKg,
      carbon_stock_tons: credits.carbonStockTons,
      co2_equivalent_kg: credits.co2EquivalentKg,
      co2_equivalent_tons: credits.co2EquivalentTons,
      credits_generated: credits.creditsGenerated,
      market_price_usd: priceUSD,
      market_price_inr: priceINR,
      estimated_value_usd: estimatedValueUSD,
      estimated_value_inr: estimatedValueINR,
      calculation_date: new Date().toISOString(),
      methodology: 'IPCC 2006 Guidelines + Voluntary Carbon Market Standards'
    };
  }

  /**
   * Store carbon credit calculation in database
   */
  static async storeCarbonCreditCalculation(
    userId: string, 
    plotId: string, 
    result: CarbonCreditResult
  ): Promise<any> {
    try {
      const query = `
        INSERT INTO carbon_credit_calculations 
        (user_id, plot_id, biomass_kg, carbon_stock_kg, carbon_stock_tons, 
         co2_equivalent_kg, co2_equivalent_tons, credits_generated, 
         market_price_usd, market_price_inr, estimated_value_usd, estimated_value_inr,
         methodology, calculation_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        userId, plotId, result.biomass_kg, result.carbon_stock_kg, result.carbon_stock_tons,
        result.co2_equivalent_kg, result.co2_equivalent_tons, result.credits_generated,
        result.market_price_usd, result.market_price_inr, result.estimated_value_usd, 
        result.estimated_value_inr, result.methodology, result.calculation_date
      ];
      
      const dbResult = await pool.query(query, values);
      return dbResult.rows[0];
    } catch (error) {
      console.error('Error storing carbon credit calculation:', error);
      throw error;
    }
  }

  /**
   * Update market prices (called by price update service)
   */
  static async updateMarketPrices(
    priceUSD: number, 
    priceINR: number, 
    marketName: string = 'Voluntary Carbon Market',
    source: string = 'Market Average'
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO carbon_market_prices (price_usd, price_inr, market_name, source, date)
        VALUES ($1, $2, $3, $4, NOW())
      `, [priceUSD, priceINR, marketName, source]);
      
      console.log(`Updated market prices: $${priceUSD} USD, ₹${priceINR} INR`);
    } catch (error) {
      console.error('Error updating market prices:', error);
      throw error;
    }
  }

  /**
   * Get carbon credit history for a user
   */
  static async getCarbonCreditHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT ccc.*, p.name as plot_name
        FROM carbon_credit_calculations ccc
        LEFT JOIN plots p ON ccc.plot_id = p.id
        WHERE ccc.user_id = $1
        ORDER BY ccc.calculation_date DESC
        LIMIT $2
      `, [userId, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching carbon credit history:', error);
      throw error;
    }
  }

  /**
   * Get total credits generated by user
   */
  static async getUserCreditSummary(userId: string): Promise<{
    total_credits: number;
    total_value_usd: number;
    total_value_inr: number;
    calculation_count: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COALESCE(SUM(credits_generated), 0) as total_credits,
          COALESCE(SUM(estimated_value_usd), 0) as total_value_usd,
          COALESCE(SUM(estimated_value_inr), 0) as total_value_inr,
          COUNT(*) as calculation_count
        FROM carbon_credit_calculations
        WHERE user_id = $1
      `, [userId]);
      
      const row = result.rows[0];
      return {
        total_credits: Math.round(parseFloat(row.total_credits) * 1000) / 1000,
        total_value_usd: Math.round(parseFloat(row.total_value_usd) * 100) / 100,
        total_value_inr: Math.round(parseFloat(row.total_value_inr) * 100) / 100,
        calculation_count: parseInt(row.calculation_count)
      };
    } catch (error) {
      console.error('Error fetching user credit summary:', error);
      throw error;
    }
  }
}

export default CarbonCreditService;
