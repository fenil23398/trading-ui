"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatPairLabel,
  SUPPORTED_PAIRS,
  type SupportedPair,
} from "@/lib/trading";
import { formatPrice } from "@/lib/format";

type PairSelectorProps = {
  value: SupportedPair;
};

type PairTicker = {
  lastPrice: number;
  changePercent: number;
};

export function PairSelector({ value }: PairSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Record<SupportedPair, PairTicker>>(
    {} as Record<SupportedPair, PairTicker>,
  );

  const onPairChange = (nextPair: SupportedPair) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pair", nextPair);
    router.replace(`/?${params.toString()}`);
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    const streams = SUPPORTED_PAIRS.map((pair) => `${pair.toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        data?: {
          s?: string;
          c?: string;
          P?: string;
        };
      };

      const symbol = payload.data?.s as SupportedPair | undefined;
      if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
        return;
      }

      const lastPrice = Number(payload.data?.c);
      const changePercent = Number(payload.data?.P);

      setStats((previous) => ({
        ...previous,
        [symbol]: {
          lastPrice: Number.isFinite(lastPrice) ? lastPrice : 0,
          changePercent: Number.isFinite(changePercent) ? changePercent : 0,
        },
      }));
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredPairs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return SUPPORTED_PAIRS;
    return SUPPORTED_PAIRS.filter((pair) =>
      formatPairLabel(pair).toLowerCase().includes(term),
    );
  }, [search]);

  return (
    <div ref={containerRef} className="relative min-w-[8.5rem] max-w-[min(100%,14rem)] flex-1 sm:min-w-28 sm:max-w-none sm:flex-none">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-8 w-full min-w-0 items-center justify-between gap-1 rounded-md border border-border bg-panel pl-2 pr-1.5 text-xs font-semibold text-text-primary outline-none transition hover:border-brand/60 sm:min-w-28 sm:pl-3 sm:pr-2"
        aria-label="Select trading pair"
      >
        <span className="min-w-0 truncate text-left">{formatPairLabel(value)}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-panel p-2 shadow-xl">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pair"
            className="mb-2 w-full rounded-md border border-border bg-panel-elevated px-2 py-1.5 text-xs outline-none focus:border-brand"
          />

          <div className="grid grid-cols-[1.2fr_1fr_0.8fr] px-2 py-1 text-[10px] text-text-secondary">
            <span>Pair</span>
            <span className="text-right">Last</span>
            <span className="text-right">24H</span>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filteredPairs.map((pair) => {
              const rowStats = stats[pair];
              const change = rowStats?.changePercent ?? 0;
              const last = rowStats?.lastPrice ?? 0;

              return (
                <button
                  key={pair}
                  type="button"
                  onClick={() => onPairChange(pair)}
                  className={`grid w-full grid-cols-[1.2fr_1fr_0.8fr] items-center rounded px-2 py-1.5 text-xs transition hover:bg-panel-elevated ${
                    pair === value ? "bg-panel-elevated" : ""
                  }`}
                >
                  <span className="text-left font-medium">{formatPairLabel(pair)}</span>
                  <span className="text-right text-text-secondary">
                    {last > 0 ? formatPrice(last, pair) : "--"}
                  </span>
                  <span className={`text-right ${change >= 0 ? "text-buy" : "text-sell"}`}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
