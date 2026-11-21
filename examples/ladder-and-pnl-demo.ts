import {
  calculateExecutableExitQuote,
  LiquidationLadder,
  PnlEngine,
  simulateSequentialSwaps
} from "../src";

const batch = simulateSequentialSwaps([0.3, 0.3, 0.3], 0, 100);
const quote = calculateExecutableExitQuote({
  tokensIn: 20_000_000,
  totalTokensHeld: batch.totalTokens,
  realQuoteReserveEth: batch.finalQuoteReserveEth,
  spotPriceEth: 0,
  ethPriceUsd: 3000
});
const ladder = LiquidationLadder.computeLadder(batch.finalQuoteReserveEth, 100, batch.totalTokens);
const pnl = PnlEngine.calculateWalletPnL(batch.totalTokens, 0.9, 0, quote.spotPriceEth);

console.log({
  ordersFilled: batch.orderTokens.length,
  markUsd: quote.markValueUsd.toFixed(2),
  executableUsd: quote.netQuoteUsd.toFixed(2),
  ladderTiers: ladder.length,
  roiPct: pnl.roiPct.toFixed(2)
});
