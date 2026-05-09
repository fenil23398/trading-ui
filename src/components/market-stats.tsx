"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import type { SupportedPair } from "@/lib/trading";

type TickerStats = {
  lastPrice: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
};

const DEFAULT_STATS: TickerStats = {
  lastPrice: 0,
  changePercent: 0,
  high: 0,
  low: 0,
  volume: 0,
};

type MarketStatsProps = {
  pair: SupportedPair;
};

function getPriceDecimals(pair: SupportedPair): number {
  if (pair === "BTCUSDT") return 2;
  if (pair === "ETHUSDT") return 2;
  if (pair === "SOLUSDT" || pair === "LINKUSDT") return 3;
  return 4;
}

export function MarketStats({ pair }: MarketStatsProps) {
  const [stats, setStats] = useState<TickerStats>(DEFAULT_STATS);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );

  useEffect(() => {
    const symbol = pair.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`);

    ws.onopen = () => {
      setStatus("live");
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        c: string;
        P: string;
        h: string;
        l: string;
        v: string;
      };

      setStats({
        lastPrice: Number(payload.c),
        changePercent: Number(payload.P),
        high: Number(payload.h),
        low: Number(payload.l),
        volume: Number(payload.v),
      });
    };

    ws.onerror = () => {
      setStatus("offline");
    };

    ws.onclose = () => {
      setStatus("offline");
    };

    return () => {
      ws.close();
    };
  }, [pair]);

  const decimals = useMemo(() => getPriceDecimals(pair), [pair]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
      <div className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-border bg-panel-elevated px-2 py-1 sm:gap-2 sm:px-2 sm:py-1.5 lg:hidden">
        <span className="shrink-0 text-[9px] text-text-secondary sm:text-[10px]">Last</span>
        <AnimatedNumber
          value={stats.lastPrice}
          decimals={decimals}
          className="max-w-[6.5rem] truncate text-xs font-semibold tabular-nums sm:max-w-none"
        />
      </div>

      <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-panel-elevated px-2 py-1.5 lg:inline-flex">
        <span className="text-[10px] text-text-secondary">Last</span>
        <AnimatedNumber
          value={stats.lastPrice}
          decimals={decimals}
          className="text-xs font-semibold"
        />
      </div>

      <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-panel-elevated px-2 py-1.5 lg:inline-flex">
        <span className="text-[10px] text-text-secondary">24h</span>
        <span
          className={`text-xs font-semibold ${
            stats.changePercent >= 0 ? "text-buy" : "text-sell"
          }`}
        >
          <AnimatedNumber
            value={stats.changePercent}
            decimals={2}
            prefix={stats.changePercent >= 0 ? "+" : ""}
            suffix="%"
          />
        </span>
      </div>

      <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-panel-elevated px-2 py-1.5 xl:inline-flex">
        <span className="text-[10px] text-text-secondary">H/L</span>
        <span className="text-xs">
          <AnimatedNumber value={stats.high} decimals={decimals} /> /{" "}
          <AnimatedNumber value={stats.low} decimals={decimals} />
        </span>
      </div>

      <div className="hidden h-8 items-center gap-2 rounded-md border border-border bg-panel-elevated px-2 py-1.5 2xl:inline-flex">
        <span className="text-[10px] text-text-secondary">Vol</span>
        <AnimatedNumber value={stats.volume} decimals={0} className="text-xs" />
      </div>

      <span
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-panel-elevated px-2 py-1 text-[10px] font-medium text-text-secondary sm:gap-1.5 sm:px-2 sm:py-1.5"
        title={status === "live" ? "Market data connected" : "Market data status"}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            status === "live"
              ? "bg-buy animate-pulse"
              : status === "connecting"
                ? "bg-brand animate-pulse"
                : "bg-sell"
          }`}
        />
        <span className="hidden sm:inline">{status}</span>
      </span>
    </div>
  );
}
