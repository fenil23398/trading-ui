"use client";

import type { SupportedPair } from "@/lib/trading";
import { MarketPanelTabs } from "@/components/market-panel-tabs";
import { TradingChart } from "@/components/trading-chart";
import { useAccount } from "wagmi";

type TradingChartSlotProps = {
  pair: SupportedPair;
};

/**
 * Connected lg+: chart + order book ~70% of left column (flex-7), min 436px tall.
 * Disconnected: fills left column (`h-full`). Mobile connected: fixed two-row stack height.
 */
export function TradingChartSlot({ pair }: TradingChartSlotProps) {
  const { isConnected } = useAccount();

  const innerGridClassName = [
    "grid w-full min-h-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)]",
    isConnected
      ? "max-lg:grid-rows-[320px_320px] max-lg:h-[648px] shrink-0 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-rows-1"
      : "h-full min-h-0 shrink-0 max-lg:grid-rows-[minmax(320px,1fr)_minmax(320px,1fr)] lg:grid-rows-1",
  ].join(" ");

  const sectionClassName = [
    "trading-chart-slot relative flex w-full min-w-0 flex-col overflow-hidden px-0 py-0 lg:min-h-0 lg:overflow-hidden",
    isConnected
      ? "shrink-0 lg:min-h-[436px] lg:min-w-0 lg:flex-[7]"
      : "min-h-0 flex-1 lg:min-h-0 lg:flex-1",
  ].join(" ");

  return (
    <section className={sectionClassName}>
      <div className={innerGridClassName}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 rounded-lg border border-border bg-panel-elevated p-2">
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
