import { describe, expect, it } from "vitest";
import { FeeCalculator } from "../src/feeCalculator";
import { LiquidationLadder } from "../src/liquidationLadder";
import { PnlEngine } from "../src/pnlEngine";

describe("PnlEngine, LiquidationLadder & FeeCalculator", () => {
  it("calculates single-wallet and aggregate PnL + round-trip break-even price", () => {
    const single = PnlEngine.calculateWalletPnL(
      1_000_000,
      0.5,
      0.1,
      0.0000008,
      "0x1111111111111111111111111111111111111111"
    );

    expect(single.currentGrossValueEth).toBeCloseTo(0.8, 6);
    expect(single.unrealizedPnlEth).toBeCloseTo(0.3, 6);
    expect(single.netPnlEth).toBeCloseTo(0.4, 6);
    expect(single.roiPct).toBeCloseTo(80, 4);

    const agg = PnlEngine.calculateAggregatePnL(
      [
        { tokensHeld: 1_000_000, initialSpendEth: 0.5, realizedPnlEth: 0.1 },
        { tokensHeld: 1_000_000, initialSpendEth: 0.5, realizedPnlEth: 0.0 }
      ],
      0.0000008,
      100,
      100
    );

    expect(agg.totalTokensHeld).toBe(2_000_000);
    expect(agg.netPnlEth).toBeCloseTo(0.7, 6);
    // Entry avg = 0.0000005 ETH/token, round-trip fee = 2% each leg -> / (0.98^2)
    expect(agg.breakEvenPriceEth).toBeCloseTo(0.0000005 / (0.98 * 0.98), 10);
  });

  it("builds 11-tier liquidation ladder with executability flags", () => {
    const ladder = LiquidationLadder.computeLadder(2.0, 100, 1_500_000);

    expect(ladder).toHaveLength(11);
    const tier1M = ladder.find((b) => b.tierTokens === 1_000_000)!;
    const tier2M = ladder.find((b) => b.tierTokens === 2_000_000)!;

    expect(tier1M.isExecutable).toBe(true);
    expect(tier2M.isExecutable).toBe(false);
    expect(tier2M.priceImpactPct).toBeGreaterThan(tier1M.priceImpactPct);
  });

  it("estimates EIP-1559 gas reserve and falls back cleanly on RPC failure", async () => {
    const live = await FeeCalculator.calculateFeeEstimate(
      {
        getFeeData: async () => ({
          maxFeePerGas: 2_000_000_000n,
          maxPriorityFeePerGas: 500_000_000n
        })
      },
      1_000_000n,
      1.5
    );

    expect(live.isFallback).toBe(false);
    expect(live.baseFeeGwei).toBeCloseTo(2.0, 5);
    expect(live.estimatedFeeEth).toBeCloseTo(0.002, 6);
    expect(live.safetyReserveEth).toBeCloseTo(0.003, 6);

    const fb = await FeeCalculator.calculateFeeEstimate({
      getFeeData: async () => {
        throw new Error("RPC offline");
      }
    });
    expect(fb.isFallback).toBe(true);
    expect(fb.totalRequiredReserveEth).toBe(0.005);
  });
});
