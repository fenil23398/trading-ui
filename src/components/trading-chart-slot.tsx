"use client";

import type { SupportedPair } from "@/lib/trading";
import { MarketPanelTabs } from "@/components/market-panel-tabs";
import { TradingChart } from "@/components/trading-chart";
import { useAccount } from "wagmi";

type TradingChartSlotProps = {
  pair: SupportedPair;
};

/** Connected: chart + order book row fixed at 436px tall. Disconnected: fills left column (`h-full`). */
export function TradingChartSlot({ pair }: TradingChartSlotProps) {
  const { isConnected } = useAccount();

  const innerGridClassName = [
    "grid w-full grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)]",
    isConnected ? "h-[436px] shrink-0" : "h-full min-h-0 shrink-0",
  ].join(" ");

  const sectionClassName = [
    "trading-chart-slot relative flex w-full min-w-0 flex-col overflow-hidden px-0 py-0 lg:min-h-0 lg:overflow-hidden lg:px-1 lg:py-1",
    isConnected ? "shrink-0" : "min-h-0 flex-1 lg:min-h-0 lg:flex-1",
  ].join(" ");

  return (
    <section className={sectionClassName}>
      <div className={innerGridClassName}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 rounded-lg border border-border bg-panel-elevated p-1.5 sm:p-2">
            <TradingChart pair={pair} />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MarketPanelTabs key={pair} pair={pair} />
        </div>
      </div>
    </section>
  );
}
