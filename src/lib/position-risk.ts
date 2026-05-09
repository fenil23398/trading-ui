/** Unrealized / realized PnL in USDT (same formula as positions table). */
export function realizedPnlUsdt(
  order: {
    side: "buy" | "sell";
    sizeUsdt: number;
    entryPrice: number;
  },
  exitPrice: number,
): number {
  if (order.entryPrice <= 0 || exitPrice <= 0 || !Number.isFinite(exitPrice)) {
    return 0;
  }
  const quantity = order.sizeUsdt / order.entryPrice;
  const direction = order.side === "buy" ? 1 : -1;
  return (exitPrice - order.entryPrice) * quantity * direction;
}

/** Same simplified margin model as order entry (demo). */
export function estimateLiquidationPrice(params: {
  side: "buy" | "sell";
  referencePrice: number;
  sizeUsdt: number;
  leverage: number;
}): number {
  const { side, referencePrice, sizeUsdt, leverage } = params;
  const maintenanceMarginRate = 0.005;
  const openFeeRate = 0.0004;
  const borrowerHourlyRate = 0.0001;
  const maintenanceMin = 1;

  if (referencePrice <= 0 || sizeUsdt <= 0 || leverage <= 0) {
    return 0;
  }

  const quantity = sizeUsdt / referencePrice;
  const collateral = sizeUsdt / leverage;
  const maintenance = Math.max(sizeUsdt * maintenanceMarginRate, maintenanceMin);
  const openFee = sizeUsdt * openFeeRate;
  const borrowerFee = sizeUsdt * borrowerHourlyRate;
  const availableBuffer = Math.max(0, collateral - maintenance - openFee - borrowerFee);
  const moveToLiquidation = quantity > 0 ? availableBuffer / quantity : 0;

  const raw =
    side === "buy"
      ? Math.max(0, referencePrice - moveToLiquidation)
      : referencePrice + moveToLiquidation;

  /**
   * When buffer rounds to zero (small notionals vs maintenanceMin), move is 0 and
   * raw === referencePrice. Then mark <= liq for longs is true at entry → instant close.
   * Treat as "no liq level" so we do not auto-liquidate on a degenerate estimate.
   */
  if (side === "buy") {
    return raw < referencePrice ? raw : 0;
  }
  return raw > referencePrice ? raw : 0;
}

/** Long: mark at or below liq. Short: mark at or above liq. */
export function isLiquidationTriggered(
  side: "buy" | "sell",
  markPrice: number,
  liquidationPrice: number,
): boolean {
  if (!Number.isFinite(markPrice) || markPrice <= 0) return false;
  if (!Number.isFinite(liquidationPrice) || liquidationPrice <= 0) return false;
  return side === "buy" ? markPrice <= liquidationPrice : markPrice >= liquidationPrice;
}
