import { FeeEstimateResult, FeeProvider } from "./types";

const GWEI_WEI = 1_000_000_000n;
const ETHER_WEI = 1_000_000_000_000_000_000n;

export function formatUnitsToFloat(valueWei: bigint, unitDivisor: bigint): number {
  const whole = valueWei / unitDivisor;
  const remainder = valueWei % unitDivisor;
  return Number(whole) + Number(remainder) / Number(unitDivisor);
}

export class FeeCalculator {
  /**
   * Dynamically estimates EIP-1559 / legacy gas reserve requirements from live RPC fee data,
   * with a conservative static fallback when RPC calls fail.
   */
  public static async calculateFeeEstimate(
    provider: FeeProvider,
    estimatedGasUnits: bigint = 1_800_000n,
    safetyMultiplier: number = 1.35
  ): Promise<FeeEstimateResult> {
    try {
      const feeData = await provider.getFeeData();
      const defaultMaxFee = 1_500_000_000n; // 1.5 gwei
      const defaultPriorityFee = 1_000_000_000n; // 1.0 gwei

      const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? defaultMaxFee;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? defaultPriorityFee;

      const estimatedFeeWei = estimatedGasUnits * maxFeePerGas;
      const safetyReserveWei =
        (estimatedFeeWei * BigInt(Math.round(safetyMultiplier * 100))) / 100n;

      const baseFeeGwei = formatUnitsToFloat(maxFeePerGas, GWEI_WEI);
      const priorityFeeGwei = formatUnitsToFloat(maxPriorityFeePerGas, GWEI_WEI);
      const estimatedFeeEth = formatUnitsToFloat(estimatedFeeWei, ETHER_WEI);
      const safetyReserveEth = formatUnitsToFloat(safetyReserveWei, ETHER_WEI);

      return {
        baseFeeGwei,
        priorityFeeGwei,
        maxFeeGwei: baseFeeGwei,
        estimatedGasUnits,
        estimatedFeeEth,
        safetyReserveEth,
        totalRequiredReserveEth: safetyReserveEth,
        isFallback: false
      };
    } catch {
      return {
        baseFeeGwei: 1.5,
        priorityFeeGwei: 1.0,
        maxFeeGwei: 1.5,
        estimatedGasUnits,
        estimatedFeeEth: 0.003,
        safetyReserveEth: 0.005,
        totalRequiredReserveEth: 0.005,
        isFallback: true
      };
    }
  }
}
