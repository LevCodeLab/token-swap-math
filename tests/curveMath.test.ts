import { describe, expect, it } from "vitest";
import {
  AMM_CURVE_CONSTANTS,
  calculateQuoteEthFromTokens,
  calculateSellProceeds,
  calculateTokensFromQuoteEth,
  getCurveInvariantK,
  simulateSequentialSwaps
} from "../src/curveMath";

describe("curveMath (x * y = k AMM)", () => {
  it("returns zero outputs on non-positive inputs", () => {
    expect(calculateTokensFromQuoteEth(0)).toEqual({ tokensOut: 0, priceImpactPct: 0 });
    expect(calculateTokensFromQuoteEth(-2)).toEqual({ tokensOut: 0, priceImpactPct: 0 });
    expect(calculateQuoteEthFromTokens(0)).toBe(0);
    expect(calculateSellProceeds(0)).toEqual({
      netQuoteOutEth: 0,
      priceImpactPct: 0,
      grossQuoteEth: 0
    });
  });

  it("matches inverse buy/quote math within floating-point tolerance", () => {
    const buy = calculateTokensFromQuoteEth(0.5, 0.25, 100);
    expect(buy.tokensOut).toBeGreaterThan(0);
    expect(buy.priceImpactPct).toBeGreaterThan(0);

    const requiredEth = calculateQuoteEthFromTokens(buy.tokensOut, 0.25, 100);
    expect(requiredEth).toBeCloseTo(0.5, 6);
  });

  it("conserves x * y = k when fees are set to 0 bps", () => {
    const zeroFeeConfig = { ...AMM_CURVE_CONSTANTS, baseFeeBps: 0 };
    const k = getCurveInvariantK(zeroFeeConfig);

    const buy = calculateTokensFromQuoteEth(1.0, 0, 0, zeroFeeConfig);
    const sell = calculateSellProceeds(buy.tokensOut, 1.0, 0, zeroFeeConfig);

    expect(k).toBeGreaterThan(1_800_000_000);
    expect(sell.grossQuoteEth).toBeCloseTo(1.0, 6);
    expect(sell.netQuoteOutEth).toBeCloseTo(1.0, 6);
  });

  it("tracks sequential multi-order reserve shifts so earlier orders get more tokens", () => {
    const sim = simulateSequentialSwaps([0.2, 0.2, 0.2, 0.2], 0, 100);

    expect(sim.orderTokens).toHaveLength(4);
    expect(sim.orderTokens[0]).toBeGreaterThan(sim.orderTokens[1]);
    expect(sim.orderTokens[1]).toBeGreaterThan(sim.orderTokens[2]);
    expect(sim.orderTokens[2]).toBeGreaterThan(sim.orderTokens[3]);
    expect(sim.totalEth).toBeCloseTo(0.8, 8);
    expect(sim.finalQuoteReserveEth).toBeCloseTo(0.8 * 0.98, 8);
  });
});
