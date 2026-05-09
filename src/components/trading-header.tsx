"use client";

import { HeaderBalance } from "@/components/header-balance";
import { MarketStats } from "@/components/market-stats";
import { PairSelector } from "@/components/pair-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet-button";
import type { SupportedPair } from "@/lib/trading";

function HeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <HeaderBalance />
      <WalletButton />
      <ThemeToggle />
    </div>
  );
}

type TradingHeaderProps = {
  selectedPair: SupportedPair;
};

export function TradingHeader({ selectedPair }: TradingHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border/60 px-0 py-2">
      {/* Mobile: row 1 = brand + actions; row 2 = pair + market strip. Desktop: one aligned row (3 columns). */}
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-4 lg:py-0">
        <div className="flex items-center justify-between gap-3 lg:justify-start lg:gap-0">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-text-primary">
            Trading UI
          </h1>
          <div className="lg:hidden">
            <HeaderActions />
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <PairSelector value={selectedPair} />
          <MarketStats key={selectedPair} pair={selectedPair} />
        </div>

        <div className="hidden lg:flex lg:justify-end">
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
