import { AMM_CURVE_CONSTANTS, getCurveInvariantK } from "./curveMath";
import { CurveConfig, ExecutableExitQuote } from "./types";

/**
 * Pure bigint 18-decimal string/number parser without external SDK dependencies.
 */
export function parseUnits18(amount: number | string): bigint {
  const raw = typeof amount === "number" ? amount.toFixed(6) : amount.trim();
  if (!raw || raw.startsWith("-")) return 0n;
  const [wholePart = "0", fracPart = ""] = raw.split(".");
  const cleanWhole = wholePart.replace(/[^0-9]/g, "") || "0";
  const cleanFrac = fracPart.replace(/[^0-9]/g, "").slice(0, 18).padEnd(18, "0");
  return BigInt(cleanWhole) * 10n ** 18n + BigInt(cleanFrac);
}

/**
 * Calculates executable exit quote against the constant-product curve invariant.
 * Distinguishes theoretical spot mark value from actual curve receive after slippage and fees.
 */
export function calculateExecutableExitQuote(params: {
  tokensIn: number;
  totalTokensHeld: number;
  realQuoteReserveEth: number;
  spotPriceEth: number;
  ethPriceUsd: number;
  poolFeeBps?: number;
  estimatedGasUnits?: number;
  gasPriceGwei?: number;
  config?: CurveConfig;
}): ExecutableExitQuote {
  const {
    tokensIn,
    totalTokensHeld,
    realQuoteReserveEth,
    spotPriceEth,
    ethPriceUsd,
    poolFeeBps = 100,
    estimatedGasUnits = 140_000,
    gasPriceGwei = 0.5,
    config = AMM_CURVE_CONSTANTS
  } = params;

  if (tokensIn <= 0) {
    return {
      tokensIn: 0,
      tokensInWei: 0n,
      spotPriceEth,
      grossQuoteEth: 0,
      netQuoteEth: 0,
      netQuoteUsd: 0,
      priceImpactPct: 0,
      estimatedGasEth: 0,
      estimatedGasUsd: 0,
      curveFeeEth: 0,
      markValueUsd: 0,
      youKeepTokens: totalTokensHeld,
      youKeepPct: 100,
      youKeepSupplyPct: (totalTokensHeld / config.totalSupply) * 100,
      quoteTimestamp: Date.now(),
      isStale: false
    };
  }

  const k = getCurveInvariantK(config);
  const currentQuoteReserve = config.virtualQuoteEth + Math.max(0, realQuoteReserveEth);
  const currentTokenReserve = k / currentQuoteReserve;

  const newTokenReserve = currentTokenReserve + tokensIn;
  const newQuoteReserve = k / newTokenReserve;

  const grossQuoteEth = Math.max(0, currentQuoteReserve - newQuoteReserve);

  const totalFeeBps = Math.min(9999, Math.max(0, config.baseFeeBps + poolFeeBps));
  const feeRatio = (10_000 - totalFeeBps) / 10_000;
  const netCurveEth = grossQuoteEth * feeRatio;
  const curveFeeEth = grossQuoteEth - netCurveEth;

  const gasEth = (estimatedGasUnits * gasPriceGwei) / 1e9;
  const estimatedGasEth = Math.max(0.00004, gasEth);
  const estimatedGasUsd = estimatedGasEth * ethPriceUsd;

  const netQuoteEth = netCurveEth;
  const netQuoteUsd = netQuoteEth * ethPriceUsd;

  const activeSpotPrice =
    spotPriceEth > 0 ? spotPriceEth : currentQuoteReserve / currentTokenReserve;
  const markValueUsd = tokensIn * activeSpotPrice * ethPriceUsd;

  const effectivePrice = tokensIn > 0 ? netCurveEth / tokensIn : activeSpotPrice;
  const priceImpactPct =
    activeSpotPrice > 0
      ? Math.max(0, Math.min(100, ((activeSpotPrice - effectivePrice) / activeSpotPrice) * 100))
      : 0;

  const youKeepTokens = Math.max(0, totalTokensHeld - tokensIn);
  const youKeepPct =
    totalTokensHeld > 0 ? Math.max(0, (youKeepTokens / totalTokensHeld) * 100) : 0;
  const youKeepSupplyPct = (youKeepTokens / config.totalSupply) * 100;

  const tokensInWei = parseUnits18(tokensIn);

  return {
    tokensIn,
    tokensInWei,
    spotPriceEth: activeSpotPrice,
    grossQuoteEth,
    netQuoteEth,
    netQuoteUsd,
    priceImpactPct,
    estimatedGasEth,
    estimatedGasUsd,
    curveFeeEth,
    markValueUsd,
    youKeepTokens,
    youKeepPct,
    youKeepSupplyPct,
    quoteTimestamp: Date.now(),
    isStale: false
  };
}

export function formatEthCompact(val: number): string {
  if (!val || Number.isNaN(val) || val <= 0) return "0";
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  if (val >= 10) return val.toFixed(2).replace(/\.00$/, "");
  if (val >= 1) return val.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (val >= 0.001) return val.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return val.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatUsdCompact(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs === 0) return "$0";
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  if (abs >= 10) return `${sign}$${Math.round(abs)}`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatTokensCompact(val: number): string {
  if (val === 0) return "0";
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + "B";
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  }
  if (val >= 1_000) return (val / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Math.round(val).toLocaleString("en-US");
}

export function formatPnlDisplay(val: number): { text: string; isPositive: boolean } {
  const isPositive = val >= 0;
  const prefix = isPositive ? "+$" : "-$";
  const abs = Math.abs(val);
  let numStr = "";
  if (abs >= 1_000_000) numStr = (abs / 1_000_000).toFixed(2) + "M";
  else if (abs >= 1_000) numStr = (abs / 1_000).toFixed(1) + "k";
  else if (abs >= 100) numStr = Math.round(abs).toString();
  else numStr = abs.toFixed(2);
  return {
    text: prefix + numStr,
    isPositive
  };
}

export function formatMinimalEth(val: number): string {
  if (!val || Number.isNaN(val) || val <= 0) return "0";
  if (val < 0.00001) return "<0.00001";
  if (val < 0.001) {
    return val.toFixed(5).replace(/\.?0+$/, "");
  }
  if (val < 0.01) {
    return val.toFixed(4).replace(/\.?0+$/, "");
  }
  const rounded = Math.round(val * 1000) / 1000;
  if (rounded % 1 === 0) return rounded.toString();
  return rounded.toFixed(3).replace(/\.?0+$/, "");
}
