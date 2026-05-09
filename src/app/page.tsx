import { PairSelector } from "@/components/pair-selector";
import { MarketPanelTabs } from "@/components/market-panel-tabs";
import { OrderEntryPanel } from "@/components/order-entry-panel";
import { MarketStats } from "@/components/market-stats";
import { PositionsPnLPanel } from "@/components/positions-pnl-panel";
import { TradingChart } from "@/components/trading-chart";
import { HeaderBalance } from "@/components/header-balance";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet-button";
import { TradingDocumentTitle } from "@/components/trading-document-title";
import { normalizePair } from "@/lib/trading";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const pairParam = params.pair;
  const pairValue = Array.isArray(pairParam) ? pairParam[0] : pairParam;
  const selectedPair = normalizePair(pairValue);

  return (
    <div className="flex min-h-screen flex-col bg-background px-3 py-2 text-text-primary lg:px-4">
      <TradingDocumentTitle pair={selectedPair} />
      <div className="flex w-full flex-1 flex-col gap-2">
        <header className="flex items-center justify-between border-b border-border/60 px-1 py-2">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">Trading UI</p>
            <PairSelector value={selectedPair} />
            <MarketStats key={selectedPair} pair={selectedPair} />
          </div>
          <div className="flex items-center gap-2">
            <HeaderBalance />
            <ThemeToggle />
            <WalletButton />
          </div>
        </header>

        <main className="grid flex-1 grid-cols-1 gap-2 lg:h-[calc(100vh-72px)] lg:grid-cols-[3fr_1fr]">
          <section className="px-1 py-1">
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="grid min-h-0 grid-cols-1 gap-2 lg:h-[70vh] lg:grid-cols-[2.2fr_0.8fr]">
                <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 rounded-lg border border-border bg-panel-elevated p-2">
                  <TradingChart pair={selectedPair} />
                </div>
              </div>
              <MarketPanelTabs key={selectedPair} pair={selectedPair} />
              </div>
              <div className="mt-3">
                <PositionsPnLPanel key={selectedPair} pair={selectedPair} />
              </div>
            </div>
          </section>
          <OrderEntryPanel pair={selectedPair} />
        </main>
      </div>
    </div>
  );
}
