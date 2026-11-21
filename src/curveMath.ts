/**
 * Constant-Product (x * y = k) AMM & Bonding Curve Mathematics
 * Exact invariant: (R_q + V_q) * (R_t + V_t) = k
 */

import {
  CurveConfig,
  SellQuoteResult,
  SequentialSwapSimulation,
  SwapQuoteResult
} from "./types";

export const AMM_CURVE_CONSTANTS: CurveConfig = {
  totalSupply: 1_000_000_000,
  virtualQuoteEth: 1.68,
  virtualTokenCount: 1_073_103_448.275862,
  realTokenCount: 793_103_448.275862,
  graduationThresholdEth: 4.2,
  baseFeeBps: 100 // 1.0% base swap fee
};

export function getCurveInvariantK(config: CurveConfig = AMM_CURVE_CONSTANTS): number {
  return config.virtualQuoteEth * config.virtualTokenCount;
}

/**
 * Calculates output tokens for a given ETH quote input along (x * y = k).
 */
export function calculateTokensFromQuoteEth(
  quoteInEth: number,
  currentRealQuoteEth: number = 0,
  poolFeeBps: number = 100,
  config: CurveConfig = AMM_CURVE_CONSTANTS
): SwapQuoteResult {
  if (quoteInEth <= 0) return { tokensOut: 0, priceImpactPct: 0 };

  const k = getCurveInvariantK(config);
  const effectiveFeeBps = Math.min(9999, Math.max(0, config.baseFeeBps + poolFeeBps));
  const netQuoteIn = quoteInEth * ((10_000 - effectiveFeeBps) / 10_000);

  const currentQuoteReserve = config.virtualQuoteEth + Math.max(0, currentRealQuoteEth);
  const newQuoteReserve = currentQuoteReserve + netQuoteIn;

  const currentTokenReserve = k / currentQuoteReserve;
  const newTokenReserve = k / newQuoteReserve;

  const rawTokensOut = Math.max(0, currentTokenReserve - newTokenReserve);
  const alreadySoldTokens = Math.max(0, config.virtualTokenCount - currentTokenReserve);
  const remainingSellable = Math.max(0, config.realTokenCount - alreadySoldTokens);
  const tokensOut = Math.min(rawTokensOut, remainingSellable);

  const spotPriceBefore = currentQuoteReserve / currentTokenReserve;
  const effectivePrice = tokensOut > 0 ? quoteInEth / tokensOut : spotPriceBefore;
  const priceImpactPct =
    spotPriceBefore > 0
      ? Math.max(0, ((effectivePrice - spotPriceBefore) / spotPriceBefore) * 100)
      : 0;

  return { tokensOut, priceImpactPct };
}

/**
 * Calculates gross ETH quote required to buy an exact desired token amount.
 */
export function calculateQuoteEthFromTokens(
  desiredTokens: number,
  currentRealQuoteEth: number = 0,
  poolFeeBps: number = 100,
  config: CurveConfig = AMM_CURVE_CONSTANTS
): number {
  if (desiredTokens <= 0) return 0;

  const k = getCurveInvariantK(config);
  const currentQuoteReserve = config.virtualQuoteEth + Math.max(0, currentRealQuoteEth);
  const currentTokenReserve = k / currentQuoteReserve;
  const minReserve = Math.max(1, config.virtualTokenCount - config.realTokenCount);
  const targetTokenReserve = Math.max(minReserve, currentTokenReserve - desiredTokens);

  const targetQuoteReserve = k / targetTokenReserve;
  const netQuoteRequired = Math.max(0, targetQuoteReserve - currentQuoteReserve);

  const effectiveFeeBps = Math.min(9999, Math.max(0, config.baseFeeBps + poolFeeBps));
  const grossQuoteRequired = netQuoteRequired / ((10_000 - effectiveFeeBps) / 10_000);

  return grossQuoteRequired;
}

/**
 * Calculates gross and net ETH proceeds when selling tokens back into the AMM curve.
 */
export function calculateSellProceeds(
  tokensIn: number,
  currentRealQuoteEth: number = 0,
  poolFeeBps: number = 100,
  config: CurveConfig = AMM_CURVE_CONSTANTS
): SellQuoteResult {
  if (tokensIn <= 0) {
    return { netQuoteOutEth: 0, priceImpactPct: 0, grossQuoteEth: 0 };
  }

  const k = getCurveInvariantK(config);
  const currentQuoteReserve = config.virtualQuoteEth + Math.max(0, currentRealQuoteEth);
  const currentTokenReserve = k / currentQuoteReserve;

  const newTokenReserve = currentTokenReserve + tokensIn;
  const newQuoteReserve = k / newTokenReserve;

  const grossQuoteOut = Math.max(0, currentQuoteReserve - newQuoteReserve);
  const effectiveFeeBps = Math.min(9999, Math.max(0, config.baseFeeBps + poolFeeBps));
  const netQuoteOut = grossQuoteOut * ((10_000 - effectiveFeeBps) / 10_000);

  const spotPriceBefore = currentQuoteReserve / currentTokenReserve;
  const effectivePrice = netQuoteOut / tokensIn;
  const priceImpactPct =
    spotPriceBefore > 0
      ? Math.max(0, ((spotPriceBefore - effectivePrice) / spotPriceBefore) * 100)
      : 0;

  return {
    netQuoteOutEth: netQuoteOut,
    priceImpactPct,
    grossQuoteEth: grossQuoteOut
  };
}

/**
 * Simulates sequential multi-order swap execution across N orders in block order.
 * Every filled order shifts the curve reserves before the next order executes.
 */
export function simulateSequentialSwaps(
  orderEthAmounts: number[],
  initialRealQuoteEth: number = 0,
  poolFeeBps: number = 100,
  config: CurveConfig = AMM_CURVE_CONSTANTS
): SequentialSwapSimulation {
  let runningQuoteReserve = Math.max(0, initialRealQuoteEth);
  let totalTokens = 0;
  let totalEth = 0;
  const orderTokens: number[] = [];
  const orderSupplyPcts: number[] = [];
  const orderPriceImpacts: number[] = [];

  const effectiveFeeBps = Math.min(9999, Math.max(0, config.baseFeeBps + poolFeeBps));

  for (const ethAmount of orderEthAmounts) {
    const { tokensOut, priceImpactPct } = calculateTokensFromQuoteEth(
      ethAmount,
      runningQuoteReserve,
      poolFeeBps,
      config
    );
    const supplyPct = (tokensOut / config.totalSupply) * 100;

    orderTokens.push(tokensOut);
    orderSupplyPcts.push(supplyPct);
    orderPriceImpacts.push(priceImpactPct);

    totalTokens += tokensOut;
    totalEth += Math.max(0, ethAmount);

    if (ethAmount > 0) {
      runningQuoteReserve += ethAmount * ((10_000 - effectiveFeeBps) / 10_000);
    }
  }

  return {
    totalTokens,
    totalEth,
    orderTokens,
    orderSupplyPcts,
    orderPriceImpacts,
    finalQuoteReserveEth: runningQuoteReserve
  };
}
