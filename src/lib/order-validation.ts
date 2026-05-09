import { formatPrice } from "@/lib/format";
import type { SupportedPair } from "@/lib/trading";

const EPS = 1e-12;

export type OrderValidationResult = {
  sizeError: string | null;
  stopLossError: string | null;
  takeProfitError: string | null;
  isValid: boolean;
};

function fmtBal(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function validateOrderForm(params: {
  side: "buy" | "sell";
  pair: SupportedPair;
  sizeNumber: number;
  virtualBalance: number;
  markPrice: number;
  liquidationPrice: number;
  useProtection: boolean;
  stopLossStr: string;
  takeProfitStr: string;
}): OrderValidationResult {
  const {
    side,
    pair,
    sizeNumber,
    virtualBalance,
    markPrice,
    liquidationPrice,
    useProtection,
    stopLossStr,
    takeProfitStr,
  } = params;

  let sizeError: string | null = null;
  if (sizeNumber <= 0) {
    sizeError = "Enter a valid order size (USDT).";
  } else if (sizeNumber > virtualBalance + EPS) {
    sizeError = `Exceeds available balance. Max ${fmtBal(virtualBalance)} USDT.`;
  }

  let stopLossError: string | null = null;
  let takeProfitError: string | null = null;

  if (useProtection) {
    const slTrim = stopLossStr.trim();
    const tpTrim = takeProfitStr.trim();
    const sl = slTrim ? Number(slTrim) : NaN;
    const tp = tpTrim ? Number(tpTrim) : NaN;

    if (slTrim && !Number.isFinite(sl)) {
      stopLossError = "Enter a valid stop loss price.";
    }
    if (tpTrim && !Number.isFinite(tp)) {
      takeProfitError = "Enter a valid take profit price.";
    }

    const hasMark = markPrice > 0 && Number.isFinite(markPrice);
    const hasLiq = liquidationPrice > 0 && Number.isFinite(liquidationPrice);

    if (hasMark && Number.isFinite(sl) && sl > 0) {
      if (side === "buy") {
        if (sl >= markPrice - EPS) {
          stopLossError = `Stop loss must be below mark (${formatPrice(markPrice, pair)}).`;
        }
        if (hasLiq && sl <= liquidationPrice + EPS) {
          stopLossError = `Stop loss must be above liquidation (${formatPrice(liquidationPrice, pair)}).`;
        }
      } else {
        if (sl <= markPrice + EPS) {
          stopLossError = `Stop loss must be above mark (${formatPrice(markPrice, pair)}).`;
        }
        if (hasLiq && sl >= liquidationPrice - EPS) {
          stopLossError = `Stop loss must be below liquidation (${formatPrice(liquidationPrice, pair)}).`;
        }
      }
    } else if ((slTrim || tpTrim) && !hasMark) {
      if (slTrim && !stopLossError) {
        stopLossError = "Waiting for live mark price to validate stop loss.";
      }
      if (tpTrim && !takeProfitError) {
        takeProfitError = "Waiting for live mark price to validate take profit.";
      }
    }

    if (hasMark && Number.isFinite(tp) && tp > 0) {
      if (side === "buy") {
        if (tp <= markPrice + EPS) {
          takeProfitError = `Take profit must be above mark (${formatPrice(markPrice, pair)}).`;
        }
      } else {
        if (tp >= markPrice - EPS) {
          takeProfitError = `Take profit must be below mark (${formatPrice(markPrice, pair)}).`;
        }
      }
    }
  }

  const isValid =
    !sizeError &&
    !stopLossError &&
    !takeProfitError;

  return { sizeError, stopLossError, takeProfitError, isValid };
}
