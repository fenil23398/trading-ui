import type { SupportedPair } from "@/lib/trading";

export function getPriceDecimals(pair: SupportedPair): number {
  if (pair === "BTCUSDT" || pair === "ETHUSDT") return 2;
  if (pair === "SOLUSDT" || pair === "LINKUSDT") return 3;
  return 4;
}

export function formatPrice(value: number, pair: SupportedPair): string {
  return value.toFixed(getPriceDecimals(pair));
}

export function formatCompact(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}
