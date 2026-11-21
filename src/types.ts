export interface CurveConfig {
  totalSupply: number;
  virtualQuoteEth: number;
  virtualTokenCount: number;
  realTokenCount: number;
  graduationThresholdEth: number;
  baseFeeBps: number;
}

export interface SwapQuoteResult {
  tokensOut: number;
  priceImpactPct: number;
}

export interface SellQuoteResult {
  netQuoteOutEth: number;
  grossQuoteEth: number;
  priceImpactPct: number;
}

export interface SequentialSwapSimulation {
  totalTokens: number;
  totalEth: number;
  orderTokens: number[];
  orderSupplyPcts: number[];
  orderPriceImpacts: number[];
  finalQuoteReserveEth: number;
}

export interface ExecutableExitQuote {
  tokensIn: number;
  tokensInWei: bigint;
  spotPriceEth: number;
  grossQuoteEth: number;
  netQuoteEth: number;
  netQuoteUsd: number;
  priceImpactPct: number;
  estimatedGasEth: number;
  estimatedGasUsd: number;
  curveFeeEth: number;
  markValueUsd: number;
  youKeepTokens: number;
  youKeepPct: number;
  youKeepSupplyPct: number;
  quoteTimestamp: number;
  isStale: boolean;
}

export interface LiquidationBracket {
  tierTokens: number;
  label: string;
  grossQuoteEth: number;
  priceImpactPct: number;
  netQuoteEth: number;
  isExecutable: boolean;
}

export interface WalletPnLRecord {
  address: string;
  tokensHeld: number;
  initialSpendEth: number;
  realizedPnlEth: number;
  costBasisEthPerToken: number;
  currentGrossValueEth: number;
  unrealizedPnlEth: number;
  netPnlEth: number;
  roiPct: number;
}

export interface AggregatePnLStats {
  totalTokensHeld: number;
  totalInitialSpendEth: number;
  totalRealizedPnlEth: number;
  currentGrossValueEth: number;
  unrealizedPnlEth: number;
  netPnlEth: number;
  roiPct: number;
  breakEvenPriceEth: number;
}

export interface FeeDataSnapshot {
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
  gasPrice?: bigint | null;
}

export interface FeeProvider {
  getFeeData: () => Promise<FeeDataSnapshot>;
}

export interface FeeEstimateResult {
  baseFeeGwei: number;
  priorityFeeGwei: number;
  maxFeeGwei: number;
  estimatedGasUnits: bigint;
  estimatedFeeEth: number;
  safetyReserveEth: number;
  totalRequiredReserveEth: number;
  isFallback: boolean;
}
