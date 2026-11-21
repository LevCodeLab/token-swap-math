/**
 * Real-time PnL and cost basis accounting engine for single and multi-wallet positions.
 */

import { AggregatePnLStats, WalletPnLRecord } from "./types";

export class PnlEngine {
  /**
   * Calculates cost basis, unrealized PnL, realized PnL, and ROI for a single wallet.
   */
  public static calculateWalletPnL(
    tokensHeld: number,
    initialSpendEth: number,
    realizedPnlEth: number,
    spotPriceEth: number,
    address: string = ""
  ): WalletPnLRecord {
    const costBasisEthPerToken = tokensHeld > 0 ? initialSpendEth / tokensHeld : 0;
    const currentGrossValueEth = tokensHeld * spotPriceEth;
    const unrealizedPnlEth = currentGrossValueEth - initialSpendEth;
    const netPnlEth = realizedPnlEth + unrealizedPnlEth;
    const roiPct = initialSpendEth > 0 ? (netPnlEth / initialSpendEth) * 100 : 0;

    return {
      address,
      tokensHeld,
      initialSpendEth,
      realizedPnlEth,
      costBasisEthPerToken,
      currentGrossValueEth,
      unrealizedPnlEth,
      netPnlEth,
      roiPct
    };
  }

  /**
   * Calculates aggregate PnL across multiple wallets plus exact round-trip fee break-even price.
   */
  public static calculateAggregatePnL(
    wallets: Array<{
      tokensHeld: number;
      initialSpendEth: number;
      realizedPnlEth: number;
    }>,
    spotPriceEth: number,
    poolFeeBps: number = 100,
    baseFeeBps: number = 100
  ): AggregatePnLStats {
    let totalTokensHeld = 0;
    let totalInitialSpendEth = 0;
    let totalRealizedPnlEth = 0;

    for (const w of wallets) {
      totalTokensHeld += w.tokensHeld;
      totalInitialSpendEth += w.initialSpendEth;
      totalRealizedPnlEth += w.realizedPnlEth;
    }

    const currentGrossValueEth = totalTokensHeld * spotPriceEth;
    const unrealizedPnlEth = currentGrossValueEth - totalInitialSpendEth;
    const netPnlEth = totalRealizedPnlEth + unrealizedPnlEth;
    const roiPct = totalInitialSpendEth > 0 ? (netPnlEth / totalInitialSpendEth) * 100 : 0;

    // Round-trip retention factor: eta = (1 - (baseFeeBps + poolFeeBps) / 10000)^2
    const feeRatio = (10_000 - (baseFeeBps + poolFeeBps)) / 10_000;
    const eta = feeRatio * feeRatio;
    const entryAvgPrice =
      totalTokensHeld > 0 ? totalInitialSpendEth / totalTokensHeld : 0;
    const breakEvenPriceEth = eta > 0 ? entryAvgPrice / eta : entryAvgPrice;

    return {
      totalTokensHeld,
      totalInitialSpendEth,
      totalRealizedPnlEth,
      currentGrossValueEth,
      unrealizedPnlEth,
      netPnlEth,
      roiPct,
      breakEvenPriceEth
    };
  }
}
