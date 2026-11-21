import { describe, expect, it } from "vitest";
import {
  calculateExecutableExitQuote,
  formatEthCompact,
  formatMinimalEth,
  formatPnlDisplay,
  formatTokensCompact,
  formatUsdCompact,
  parseUnits18
} from "../src/positionMath";

describe("positionMath & exit quoting", () => {
  it("computes executable exit quote below unimpacted spot mark value", () => {
    const quote = calculateExecutableExitQuote({
      tokensIn: 25_000_000,
      totalTokensHeld: 50_000_000,
      realQuoteReserveEth: 1.5,
      spotPriceEth: 0,
      ethPriceUsd: 3000,
      poolFeeBps: 100
    });

    expect(quote.grossQuoteEth).toBeGreaterThan(quote.netQuoteEth);
    expect(quote.markValueUsd).toBeGreaterThan(quote.netQuoteUsd);
    expect(quote.priceImpactPct).toBeGreaterThan(1);
    expect(quote.youKeepTokens).toBe(25_000_000);
    expect(quote.youKeepPct).toBeCloseTo(50, 5);
    expect(quote.tokensInWei).toBe(25_000_000n * 10n ** 18n);
  });

  it("parses 18-decimal values and formats compact metrics cleanly", () => {
    expect(parseUnits18("1.5")).toBe(1_500_000_000_000_000_000n);
    expect(formatEthCompact(1250)).toBe("1.3K");
    expect(formatMinimalEth(0.000004)).toBe("<0.00001");
    expect(formatUsdCompact(-2500)).toBe("-$2.5K");
    expect(formatTokensCompact(1_500_000)).toBe("1.50M");
    expect(formatPnlDisplay(420.5)).toEqual({ text: "+$421", isPositive: true });
    expect(formatPnlDisplay(-12.34)).toEqual({ text: "-$12.34", isPositive: false });
  });
});
