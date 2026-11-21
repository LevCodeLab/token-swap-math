import { AMM_CURVE_CONSTANTS, calculateSellProceeds } from "./curveMath";
import { CurveConfig, LiquidationBracket } from "./types";

export const STANDARD_TIERS: ReadonlyArray<{ tokens: number; label: string }> = [
  { tokens: 10_000, label: "10,000" },
  { tokens: 50_000, label: "50,000" },
  { tokens: 100_000, label: "100,000" },
  { tokens: 200_000, label: "200,000" },
  { tokens: 500_000, label: "500,000" },
  { tokens: 1_000_000, label: "1,000,000 (1M)" },
  { tokens: 2_000_000, label: "2,000,000 (2M)" },
  { tokens: 5_000_000, label: "5,000,000 (5M)" },
  { tokens: 10_000_000, label: "10,000,000 (10M)" },
  { tokens: 50_000_000, label: "50,000,000 (50M)" },
  { tokens: 100_000_000, label: "100,000,000 (100M)" }
];

export class LiquidationLadder {
  /**
   * Generates simulated exit proceeds and slippage impact across 11 standard token holding tiers.
   */
  public static computeLadder(
    currentRealQuoteEth: number,
    poolFeeBps: number = 100,
    totalHoldingTokens: number = 0,
    tiers: ReadonlyArray<{ tokens: number; label: string }> = STANDARD_TIERS,
    config: CurveConfig = AMM_CURVE_CONSTANTS
  ): LiquidationBracket[] {
    return tiers.map((tier) => {
      const isExecutable = totalHoldingTokens <= 0 || tier.tokens <= totalHoldingTokens;
      const res = calculateSellProceeds(tier.tokens, currentRealQuoteEth, poolFeeBps, config);

      return {
        tierTokens: tier.tokens,
        label: tier.label,
        grossQuoteEth: res.grossQuoteEth,
        priceImpactPct: res.priceImpactPct,
        netQuoteEth: res.netQuoteOutEth,
        isExecutable
      };
    });
  }
}
