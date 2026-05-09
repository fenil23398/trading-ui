export const SUPPORTED_PAIRS = [
  "BTCUSDT",
  "ETHUSDT",
  "XRPUSDT",
  "SOLUSDT",
  "LINKUSDT",
] as const;

export const DEFAULT_PAIR = "BTCUSDT";

export type SupportedPair = (typeof SUPPORTED_PAIRS)[number];

export function normalizePair(rawPair?: string): SupportedPair {
  if (!rawPair) {
    return DEFAULT_PAIR;
  }

  const normalized = rawPair.toUpperCase();

  if (SUPPORTED_PAIRS.includes(normalized as SupportedPair)) {
    return normalized as SupportedPair;
  }

  return DEFAULT_PAIR;
}

export function formatPairLabel(pair: SupportedPair): string {
  return `${pair.replace("USDT", "")}/USDT`;
}

export const MAX_LEVERAGE_BY_PAIR: Record<SupportedPair, number> = {
  BTCUSDT: 100,
  ETHUSDT: 75,
  XRPUSDT: 50,
  SOLUSDT: 50,
  LINKUSDT: 40,
};
