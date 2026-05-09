"use client";

import { useEffect } from "react";
import { useTradingStore } from "@/store/trading-store";

const balanceStr = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HeaderBalance() {
  const virtualBalance = useTradingStore((state) => state.virtualBalance);
  const initialized = useTradingStore((state) => state.initialized);
  const initializePaperSession = useTradingStore((state) => state.initializePaperSession);

  useEffect(() => {
    initializePaperSession();
  }, [initializePaperSession]);

  const display = initialized ? virtualBalance : 0;

  return (
    <div
      className="flex h-8 max-w-[min(11rem,42vw)] items-center gap-1 rounded-md border border-border bg-panel-elevated px-2 sm:max-w-[11rem] sm:gap-1.5 sm:px-2.5"
      title="Simulated USDT (paper trading — not real funds)"
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand">
        Virt.
      </span>
      <span className="min-w-0 truncate text-xs font-semibold tabular-nums text-text-primary">
        {balanceStr(display)}
      </span>
      <span className="shrink-0 text-[11px] text-text-secondary">USDT</span>
    </div>
  );
}
